"use client";

// ============================================================
// SignatureCaptureDialog — one-time "set up your autograph
// signature" step. Same canvas/library (`signature_pad`) as the
// public /firmar/[token] patient-signing flow, but in-app and
// authenticated: the signing person IS the logged-in user, so there's
// no OTP/token round-trip, just draw + save via
// POST /api/account/profile/signature.
//
// Used by prescription-tab.tsx to gate "Firmar y emitir receta" when
// the prescribing doctor has no signature on file yet.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import SignaturePad from "signature_pad";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SignatureCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLicenseInstitution?: string | null;
  onSaved: () => void;
}

export function SignatureCaptureDialog({
  open,
  onOpenChange,
  initialLicenseInstitution,
  onSaved,
}: SignatureCaptureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [licenseInstitution, setLicenseInstitution] = useState(initialLicenseInstitution ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    padRef.current = new SignaturePad(canvas, { backgroundColor: "#ffffff" });
    return () => {
      padRef.current?.off();
      padRef.current = null;
    };
  }, [open]);

  async function handleSave() {
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error("Dibuja tu firma antes de continuar");
      return;
    }
    setSaving(true);
    try {
      const signatureDataUrl = padRef.current.toDataURL("image/png");
      const res = await fetch("/api/account/profile/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl,
          licenseInstitution: licenseInstitution.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo guardar la firma");
        return;
      }
      toast.success("Firma guardada");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Save doctor signature error:", err);
      toast.error("No se pudo guardar la firma");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configura tu firma</DialogTitle>
          <DialogDescription>
            Se usará en tus recetas y documentos firmados. Solo necesitas capturarla una vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Institución que expidió tu cédula</Label>
            <Input
              value={licenseInstitution}
              onChange={(e) => setLicenseInstitution(e.target.value)}
              placeholder="ej. Universidad Nacional Autónoma de México"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Firma</Label>
            <canvas ref={canvasRef} className="h-40 w-full touch-none rounded-md border border-border bg-white" />
            <button
              type="button"
              onClick={() => padRef.current?.clear()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Borrar y firmar de nuevo
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Guardar firma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
