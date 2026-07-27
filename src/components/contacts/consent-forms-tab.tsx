"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Plus, Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { getClinicalPhotoUrl } from "@/lib/storage/clinical-photos";
import { ConsentTemplateDialog } from "@/components/contacts/consent-template-dialog";
import type { ConsentDocument, ConsentSignature, ConsentTemplate, PatientProfile } from "@/types";

interface ConsentFormsTabProps {
  contactId: string;
}

interface ConsentDocumentWithSignature extends ConsentDocument {
  signature?: ConsentSignature | ConsentSignature[] | null;
}

const STATUS_STYLE: Record<ConsentDocument["status"], string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  signed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  declined: "bg-red-500/10 text-red-500 border-red-500/30",
  expired: "bg-muted text-muted-foreground border-border",
};

/**
 * Consentimientos tab — informed-consent documents for this patient,
 * each optionally sent for signature via /api/consent-documents/[id]/send
 * (emails a link to the /firmar/[token] public page). See migration
 * 072's module comment for the legal reasoning behind the OTP step.
 */
export function ConsentFormsTab({ contactId }: ConsentFormsTabProps) {
  const t = useTranslations("Contacts.detailView.consentTab");
  const supabase = createClient();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<ConsentDocumentWithSignature[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"text" | "template">("text");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [signatureUrls, setSignatureUrls] = useState<Record<string, string | null>>({});
  const [signedPdfUrls, setSignedPdfUrls] = useState<Record<string, string | null>>({});
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/consent-templates");
      const data = await res.json().catch(() => ({}));
      setTemplates((data.templates ?? []) as ConsentTemplate[]);
    } catch (err) {
      console.error("Load consent templates error:", err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const fetchDocuments = useCallback(async (patientProfileId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consent-documents?patient_profile_id=${patientProfileId}`);
      const data = await res.json();
      const docs = (data.documents ?? []) as ConsentDocumentWithSignature[];
      setDocuments(docs);

      const urls: Record<string, string | null> = {};
      const pdfUrls: Record<string, string | null> = {};
      await Promise.all(
        docs.map(async (doc) => {
          const sig = Array.isArray(doc.signature) ? doc.signature[0] : doc.signature;
          if (sig?.signature_storage_path) {
            urls[doc.id] = await getClinicalPhotoUrl(sig.signature_storage_path);
          }
          if (sig?.signed_pdf_storage_path) {
            pdfUrls[doc.id] = await getClinicalPhotoUrl(sig.signed_pdf_storage_path);
          }
        }),
      );
      setSignatureUrls(urls);
      setSignedPdfUrls(pdfUrls);
    } catch (err) {
      console.error("Load consent documents error:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      const { data } = await supabase
        .from("patient_profiles")
        .select("*")
        .eq("contact_id", contactId)
        .maybeSingle();
      if (cancelled) return;
      const p = (data ?? null) as PatientProfile | null;
      setProfile(p);
      if (p) await fetchDocuments(p.id);
      if (!cancelled) setLoadingProfile(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId, supabase, fetchDocuments]);

  function openCreateDialog() {
    setCreateMode("text");
    setSelectedTemplateId("");
    setCreateOpen(true);
    void fetchTemplates();
  }

  async function handleCreate() {
    if (!profile) return;

    const body: Record<string, string> =
      createMode === "template"
        ? { patientProfileId: profile.id, templateId: selectedTemplateId }
        : { patientProfileId: profile.id, title: draftTitle.trim(), content: draftContent.trim() };

    if (createMode === "template" && !selectedTemplateId) {
      toast.error(t("templateRequired"));
      return;
    }
    if (createMode === "text" && (!draftTitle.trim() || !draftContent.trim())) {
      toast.error(t("titleAndContentRequired"));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/consent-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t("created"));
      setCreateOpen(false);
      setDraftTitle("");
      setDraftContent("");
      setSelectedTemplateId("");
      await fetchDocuments(profile.id);
    } catch (err) {
      console.error("Create consent document error:", err);
      toast.error(t("createFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function handleSend(documentId: string) {
    setSendingId(documentId);
    try {
      const res = await fetch(`/api/consent-documents/${documentId}/send`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t("sent", { email: data.sentTo }));
    } catch (err) {
      console.error("Send consent document error:", err);
      toast.error(err instanceof Error ? err.message : t("sendFailed"));
    } finally {
      setSendingId(null);
    }
  }

  if (loadingProfile || loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("noProfile")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("title")}</p>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="size-3.5" />
          {t("newDocument")}
        </Button>
      </div>

      {documents.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const signature = Array.isArray(doc.signature) ? doc.signature[0] : doc.signature;
            return (
              <div key={doc.id} className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[doc.status]}`}
                  >
                    {t(`status.${doc.status}`)}
                  </span>
                </div>

                {signature ? (
                  <div className="flex items-center gap-3 rounded-md border border-border bg-card p-2">
                    {signatureUrls[doc.id] && (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URL to a private bucket
                      <img
                        src={signatureUrls[doc.id]!}
                        alt=""
                        className="h-12 w-24 rounded border border-border bg-white object-contain"
                      />
                    )}
                    <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                      <p className="truncate text-foreground">{signature.signer_name}</p>
                      <p>{new Date(signature.signed_at).toLocaleString()}</p>
                    </div>
                    {signedPdfUrls[doc.id] && (
                      <a
                        href={signedPdfUrls[doc.id]!}
                        target="_blank"
                        rel="noreferrer"
                        className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Download className="size-3.5" />
                        {t("downloadSignedPdf")}
                      </a>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSend(doc.id)}
                    disabled={sendingId === doc.id}
                  >
                    {sendingId === doc.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    {t("sendToSign")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("newDocumentTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-1.5 rounded-md bg-muted p-1">
              <button
                type="button"
                onClick={() => setCreateMode("text")}
                className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  createMode === "text" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t("modeText")}
              </button>
              <button
                type="button"
                onClick={() => setCreateMode("template")}
                className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  createMode === "template" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t("modeTemplate")}
              </button>
            </div>

            {createMode === "text" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("docTitleLabel")}</Label>
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder={t("docTitlePlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("docContentLabel")}</Label>
                  <Textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={8}
                    className="text-sm"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{t("templateLabel")}</Label>
                  <button
                    type="button"
                    onClick={() => setTemplateDialogOpen(true)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("newTemplate")}
                  </button>
                </div>
                {loadingTemplates ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                    {t("noTemplates")}
                  </p>
                ) : (
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">{t("selectTemplate")}</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={creating}>
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConsentTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onCreated={(tpl) => {
          setTemplates((prev) => [tpl, ...prev]);
          setSelectedTemplateId(tpl.id);
        }}
      />
    </div>
  );
}
