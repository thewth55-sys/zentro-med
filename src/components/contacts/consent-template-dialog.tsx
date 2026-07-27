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
import { uploadConsentTemplatePdf } from "@/lib/storage/clinical-photos";
import { PdfStampPicker } from "@/components/contacts/pdf-stamp-picker";
import type { ConsentTemplate, StampField } from "@/types";

interface ConsentTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (template: ConsentTemplate) => void;
}

/**
 * Registers a reusable PDF consent template — upload once, reuse for
 * every patient sent this document. Staff click directly on the
 * rendered PDF (PdfStampPicker) to place where the signature, the
 * signer's name, and the signed date each land at signing time; see
 * migration 075's module comment for why these are three independent
 * positions rather than one fixed block.
 */
export function ConsentTemplateDialog({ open, onOpenChange, onCreated }: ConsentTemplateDialogProps) {
  const t = useTranslations("Contacts.detailView.consentTab.templateDialog");
  const { accountId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stampFields, setStampFields] = useState<StampField[]>([]);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setFile(null);
    setStampFields([]);
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
    setStampFields([]);
  }

  async function handleSave() {
    if (!accountId || !file || !name.trim()) {
      toast.error(t("nameAndFileRequired"));
      return;
    }
    if (!stampFields.some((f) => f.type === "signature")) {
      toast.error(t("signaturePositionRequired"));
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
        body: JSON.stringify({ name: name.trim(), storagePath: path, stampFields }),
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
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

          {file && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("stampHint")}</Label>
              <PdfStampPicker file={file} fields={stampFields} onChange={setStampFields} />
            </div>
          )}
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
