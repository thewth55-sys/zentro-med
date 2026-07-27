"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { getClinicalPhotoUrl } from "@/lib/storage/clinical-photos";
import type { ConsentDocument, ConsentSignature, PatientProfile } from "@/types";

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
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [signatureUrls, setSignatureUrls] = useState<Record<string, string | null>>({});

  const fetchDocuments = useCallback(async (patientProfileId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consent-documents?patient_profile_id=${patientProfileId}`);
      const data = await res.json();
      const docs = (data.documents ?? []) as ConsentDocumentWithSignature[];
      setDocuments(docs);

      const urls: Record<string, string | null> = {};
      await Promise.all(
        docs.map(async (doc) => {
          const sig = Array.isArray(doc.signature) ? doc.signature[0] : doc.signature;
          if (sig?.signature_storage_path) {
            urls[doc.id] = await getClinicalPhotoUrl(sig.signature_storage_path);
          }
        }),
      );
      setSignatureUrls(urls);
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

  async function handleCreate() {
    if (!profile) return;
    if (!draftTitle.trim() || !draftContent.trim()) {
      toast.error(t("titleAndContentRequired"));
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/consent-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientProfileId: profile.id,
          title: draftTitle.trim(),
          content: draftContent.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");
      toast.success(t("created"));
      setCreateOpen(false);
      setDraftTitle("");
      setDraftContent("");
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
        <Button size="sm" onClick={() => setCreateOpen(true)}>
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
                    <div className="min-w-0 text-xs text-muted-foreground">
                      <p className="truncate text-foreground">{signature.signer_name}</p>
                      <p>{new Date(signature.signed_at).toLocaleString()}</p>
                    </div>
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
    </div>
  );
}
