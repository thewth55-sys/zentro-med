"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { getClinicalPhotoUrl } from "@/lib/storage/clinical-photos";
import { ConsentTemplateDialog } from "@/components/contacts/consent-template-dialog";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import type { ConsentDocument, ConsentSignature, ConsentTemplate, PatientProfile } from "@/types";

interface ConsentFormsTabProps {
  contactId: string;
}

interface ConsentDocumentWithSignature extends ConsentDocument {
  signature?: ConsentSignature | ConsentSignature[] | null;
}

const STATUS_STYLE: Record<ConsentDocument["status"], string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  signed: "bg-primary/15 text-primary",
  declined: "bg-red-500/15 text-red-600 dark:text-red-400",
  expired: "bg-muted text-muted-foreground",
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
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<ConsentDocumentWithSignature | null>(null);

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
    setCustomFieldValues({});
    setCreateOpen(true);
    void fetchTemplates();
  }

  const selectedTemplate = templates.find((tpl) => tpl.id === selectedTemplateId);
  const templateCustomFields = selectedTemplate?.stamp_fields?.filter((f) => f.type === "custom_text") ?? [];

  async function handleCreate() {
    if (!profile) return;

    if (createMode === "template" && !selectedTemplateId) {
      toast.error(t("templateRequired"));
      return;
    }
    if (createMode === "text" && (!draftTitle.trim() || !draftContent.trim())) {
      toast.error(t("titleAndContentRequired"));
      return;
    }
    if (createMode === "template" && templateCustomFields.some((f) => !customFieldValues[f.id]?.trim())) {
      toast.error(t("customFieldsRequired"));
      return;
    }

    const body: Record<string, unknown> =
      createMode === "template"
        ? { patientProfileId: profile.id, templateId: selectedTemplateId, customFieldValues }
        : { patientProfileId: profile.id, title: draftTitle.trim(), content: draftContent.trim() };

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
      setCustomFieldValues({});
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
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">{t("title")}</h3>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="size-3.5" />
          {t("newDocument")}
        </Button>
      </div>

      {documents.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => {
            const signature = Array.isArray(doc.signature) ? doc.signature[0] : doc.signature;
            const isPending = doc.status === "pending";
            return (
              <div key={doc.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex w-full items-center gap-3">
                  <FileText className="size-[18px] shrink-0 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => signature && setViewDoc(doc)}
                    disabled={!signature}
                    className="min-w-0 flex-1 text-left leading-tight enabled:cursor-pointer"
                  >
                    <p className="truncate text-[13px] font-semibold text-foreground">{doc.title}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {signature
                        ? t("signedOn", { date: new Date(signature.signed_at).toLocaleDateString() })
                        : new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </button>
                  {isPending ? (
                    <button
                      type="button"
                      onClick={() => handleSend(doc.id)}
                      disabled={sendingId === doc.id}
                      className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold transition-opacity hover:opacity-80 disabled:opacity-60 ${STATUS_STYLE.pending}`}
                    >
                      {sendingId === doc.id ? <Loader2 className="size-3 animate-spin" /> : t("sendToSign")}
                    </button>
                  ) : (
                    <span
                      className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${STATUS_STYLE[doc.status]}`}
                    >
                      {t(`status.${doc.status}`)}
                    </span>
                  )}
                </div>

                {signature && signatureUrls[doc.id] && (
                  <button
                    type="button"
                    onClick={() => setViewDoc(doc)}
                    className="mt-2 flex w-full items-center gap-3 rounded-md border border-border bg-muted/30 p-2 text-left hover:border-primary/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed URL to a private bucket */}
                    <img
                      src={signatureUrls[doc.id]!}
                      alt=""
                      className="h-10 w-20 rounded border border-border bg-white object-contain"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-primary">{t("viewFull")}</span>
                  </button>
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
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value);
                      setCustomFieldValues({});
                    }}
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
                {templateCustomFields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    <Input
                      value={customFieldValues[field.id] ?? ""}
                      onChange={(e) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                    />
                  </div>
                ))}
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

      <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="sm:max-w-2xl">
          {viewDoc &&
            (() => {
              const signature = Array.isArray(viewDoc.signature) ? viewDoc.signature[0] : viewDoc.signature;
              if (!signature) return null;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>{viewDoc.title}</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("signature")}
                      </p>
                      {signatureUrls[viewDoc.id] && (
                        // eslint-disable-next-line @next/next/no-img-element -- signed URL to a private bucket
                        <img
                          src={signatureUrls[viewDoc.id]!}
                          alt=""
                          className="h-32 w-full max-w-xs rounded border border-border bg-white object-contain"
                        />
                      )}
                      <p className="text-sm text-foreground">{signature.signer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(signature.signed_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("document")}
                        </p>
                        {signedPdfUrls[viewDoc.id] && (
                          <a
                            href={signedPdfUrls[viewDoc.id]!}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <Download className="size-3.5" />
                            {t("downloadSignedPdf")}
                          </a>
                        )}
                      </div>
                      {viewDoc.source_type === "pdf" ? (
                        signedPdfUrls[viewDoc.id] ? (
                          <PdfViewer url={signedPdfUrls[viewDoc.id]!} width={560} />
                        ) : (
                          <p className="text-xs text-muted-foreground">{t("signedPdfUnavailable")}</p>
                        )
                      ) : (
                        <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground">
                          {viewDoc.content}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
