"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { uploadConsentTemplatePdf, getClinicalPhotoUrl } from "@/lib/storage/clinical-photos";
import type { ConsentTemplate } from "@/types";

interface ConsentTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (template: ConsentTemplate) => void;
}

/**
 * Registers a reusable PDF consent template — upload once, reuse for
 * every patient sent this document. The only per-template config is
 * WHERE the signature gets stamped at signing time (page + position
 * as a percentage of the page); see migration 074's module comment
 * for why this doesn't rewrite any other text in the PDF.
 */
export function ConsentTemplateDialog({ open, onOpenChange, onCreated }: ConsentTemplateDialogProps) {
  const t = useTranslations("Contacts.detailView.consentTab.templateDialog");
  const { accountId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stampPage, setStampPage] = useState("1");
  const [stampX, setStampX] = useState("55");
  const [stampY, setStampY] = useState("12");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setFile(null);
    setPreviewUrl(null);
    setStampPage("1");
    setStampX("55");
    setStampY("12");
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      toast.error(t("invalidType"));
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleSave() {
    if (!accountId || !file || !name.trim()) {
      toast.error(t("nameAndFileRequired"));
      return;
    }
    const pageNumber = Number(stampPage);
    const xFraction = Number(stampX) / 100;
    const yFraction = Number(stampY) / 100;
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      toast.error(t("invalidPage"));
      return;
    }
    if (!(xFraction >= 0 && xFraction <= 1) || !(yFraction >= 0 && yFraction <= 1)) {
      toast.error(t("invalidPosition"));
      return;
    }

    setSaving(true);
    setUploading(true);
    try {
      const { path } = await uploadConsentTemplatePdf(accountId, file);
      setUploading(false);

      const res = await fetch("/api/consent-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          storagePath: path,
          stampPageNumber: pageNumber,
          stampXFraction: xFraction,
          stampYFraction: yFraction,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "failed");

      toast.success(t("created"));
      onCreated(data.template as ConsentTemplate);
      onOpenChange(false);
      reset();
    } catch (err) {
      console.error("Create consent template error:", err);
      toast.error(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("nameLabel")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("fileLabel")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="size-3.5" />
                {file ? file.name : t("chooseFile")}
              </Button>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelected} />
            </div>

            <p className="text-xs text-muted-foreground">{t("stampHint")}</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("pageLabel")}</Label>
                <Input value={stampPage} onChange={(e) => setStampPage(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("xLabel")}</Label>
                <Input value={stampX} onChange={(e) => setStampX(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("yLabel")}</Label>
                <Input value={stampY} onChange={(e) => setStampY(e.target.value)} inputMode="numeric" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("previewLabel")}</Label>
            {previewUrl ? (
              <iframe src={previewUrl} title="preview" className="h-64 w-full rounded-md border border-border sm:h-80" />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground sm:h-80">
                {t("noPreview")}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {uploading ? t("uploading") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Re-exported so consumers don't need to reach into the storage lib
// just to show a template's own PDF for reference.
export { getClinicalPhotoUrl };
