"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CLINICAL_PHOTO_MAX_BYTES,
  deleteClinicalPhoto,
  getClinicalPhotoUrl,
  uploadClinicalPhoto,
} from "@/lib/storage/clinical-photos";
import type { PatientProfile, VisitPhoto } from "@/types";

interface VisitPhotosTabProps {
  contactId: string;
}

interface FileWithUrl extends VisitPhoto {
  url: string | null;
}

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function isImageType(contentType?: string | null): boolean {
  return !!contentType && contentType.startsWith("image/");
}

/**
 * Archivos tab — durable file history per patient (photos, signed
 * PDFs, referral letters, etc.), uploaded to the private
 * `clinical-photos` bucket (migrations 067/070) and displayed via
 * short-lived signed URLs, never a public link. Same
 * converted-patient gate as the odontogram — only available once the
 * contact has a patient_profiles row.
 */
export function VisitPhotosTab({ contactId }: VisitPhotosTabProps) {
  const t = useTranslations("Contacts.detailView.photosTab");
  const supabase = createClient();
  const { accountId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [files, setFiles] = useState<FileWithUrl[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewerFile, setViewerFile] = useState<FileWithUrl | null>(null);

  // Add-file flow: pick a file, then confirm with an optional note
  // before it actually uploads.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingNote, setPendingNote] = useState("");

  const fetchFiles = useCallback(
    async (patientProfileId: string) => {
      const { data } = await supabase
        .from("visit_photos")
        .select("*")
        .eq("patient_profile_id", patientProfileId)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as VisitPhoto[];
      const withUrls = await Promise.all(
        rows.map(async (p) => ({ ...p, url: await getClinicalPhotoUrl(p.storage_path) })),
      );
      setFiles(withUrls);
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("patient_profiles")
        .select("*")
        .eq("contact_id", contactId)
        .maybeSingle();
      if (cancelled) return;
      const p = (data ?? null) as PatientProfile | null;
      setProfile(p);
      if (p) await fetchFiles(p.id);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId, supabase, fetchFiles]);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t("invalidType"));
      return;
    }
    if (file.size > CLINICAL_PHOTO_MAX_BYTES) {
      toast.error(t("tooLarge"));
      return;
    }

    setPendingFile(file);
    setPendingNote("");
  }

  async function confirmUpload() {
    if (!pendingFile || !profile || !accountId) return;

    setUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { path } = await uploadClinicalPhoto(accountId, profile.id, pendingFile);
      const { error } = await supabase.from("visit_photos").insert({
        account_id: accountId,
        patient_profile_id: profile.id,
        storage_path: path,
        file_name: pendingFile.name,
        content_type: pendingFile.type,
        caption: pendingNote.trim() || null,
        uploaded_by: session?.user?.id ?? null,
      });
      if (error) throw error;
      toast.success(t("uploaded"));
      setPendingFile(null);
      setPendingNote("");
      await fetchFiles(profile.id);
    } catch (err) {
      console.error("Upload file error:", err);
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(file: FileWithUrl) {
    setDeletingId(file.id);
    try {
      const { error } = await supabase.from("visit_photos").delete().eq("id", file.id);
      if (error) throw error;
      await deleteClinicalPhoto(file.storage_path).catch(() => {});
      setFiles((prev) => prev.filter((p) => p.id !== file.id));
      if (viewerFile?.id === file.id) setViewerFile(null);
      toast.success(t("deleted"));
    } catch (err) {
      console.error("Delete file error:", err);
      toast.error(t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  function openFile(file: FileWithUrl) {
    setViewerFile(file);
  }

  if (loading) {
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
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("title")}
        </p>
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Paperclip className="size-3.5" />
          {t("upload")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {files.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => openFile(file)}
              title={file.file_name ?? undefined}
              className="group flex flex-col gap-1 rounded-md text-left"
            >
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-border bg-muted group-hover:border-primary/50">
                {isImageType(file.content_type) ? (
                  file.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URL to a private bucket, not a Next-optimizable static asset
                    <img src={file.url} alt="" className="size-full object-cover" />
                  ) : (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  )
                ) : (
                  <FileText className="size-8 text-muted-foreground" />
                )}
              </div>
              <p className="truncate px-0.5 text-[11px] text-foreground">
                {file.file_name || t("untitledFile")}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Add-file confirmation — lets staff attach a note before it uploads */}
      <Dialog open={!!pendingFile} onOpenChange={(open) => !open && setPendingFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addFileTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="truncate text-sm text-foreground">{pendingFile?.name}</p>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("note")}</Label>
              <Textarea
                value={pendingNote}
                onChange={(e) => setPendingNote(e.target.value)}
                placeholder={t("notePlaceholder")}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPendingFile(null)} disabled={uploading}>
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={confirmUpload} disabled={uploading}>
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File viewer — image preview inline, non-images (PDF/Word) get an
          "Abrir" link instead since browsers can't preview those inline. */}
      <Dialog open={!!viewerFile} onOpenChange={(open) => !open && setViewerFile(null)}>
        <DialogContent className="sm:max-w-2xl">
          {viewerFile && isImageType(viewerFile.content_type) ? (
            viewerFile.url && (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL to a private bucket
              <img src={viewerFile.url} alt="" className="max-h-[70vh] w-full rounded-md object-contain" />
            )
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-muted/30 py-10">
              <FileText className="size-10 text-muted-foreground" />
              <p className="max-w-full truncate px-4 text-sm text-foreground">
                {viewerFile?.file_name || t("untitledFile")}
              </p>
              {viewerFile?.url && (
                <a
                  href={viewerFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary hover:text-primary/80"
                >
                  {t("open")}
                </a>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">
                {viewerFile && new Date(viewerFile.created_at).toLocaleString()}
              </p>
              {viewerFile?.caption && (
                <p className="truncate text-xs text-foreground">{viewerFile.caption}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!viewerFile || deletingId === viewerFile.id}
                onClick={() => viewerFile && handleDelete(viewerFile)}
              >
                {viewerFile && deletingId === viewerFile.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                {t("delete")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewerFile(null)}>
                <X className="size-3.5" />
                {t("close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
