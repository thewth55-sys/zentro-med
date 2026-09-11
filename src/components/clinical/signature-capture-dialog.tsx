"use client";

// ============================================================
// SignatureCaptureDialog — draw-a-fresh-signature-right-now dialog.
// Same canvas/library (`signature_pad`) as the public
// /firmar/[token] patient-signing flow, but in-app: no OTP/token
// round-trip, the signer is present at this screen.
//
// Deliberately does NOT persist the signature anywhere itself — it
// hands the drawn PNG dataURL to `onConfirm` and lets the caller
// decide what to do with it (see prescription-tab.tsx: uploads it
// keyed by a one-time verification token, never reused for a later
// document). Stays open with an error toast if `onConfirm` rejects,
// so the drawn signature isn't lost on a transient failure.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import SignaturePad from "signature_pad";

import { Button } from "@/components/ui/button";
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
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: (signatureDataUrl: string) => Promise<void> | void;
}

export function SignatureCaptureDialog({
  open,
  onOpenChange,
  title = "Firma esta receta",
  description = "Dibuja tu firma para emitir el documento. Se requiere una firma nueva cada vez, por seguridad.",
  confirmLabel = "Firmar",
  onConfirm,
}: SignatureCaptureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Robust against the canvas mounting inside a Dialog portal/enter
  // transition, where `offsetWidth`/`offsetHeight` can still read 0
  // on the very first effect tick (this bit us: the canvas looked
  // right but never responded to clicks because SignaturePad had
  // bound to a 0×0 backing store). Retry with a ResizeObserver
  // instead of assuming layout is ready the instant `open` flips.
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let initialized = false;
    function init() {
      if (initialized || !canvas) return;
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      if (width === 0 || height === 0) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current = new SignaturePad(canvas, { backgroundColor: "#ffffff" });
      initialized = true;
    }

    init();
    const observer = new ResizeObserver(() => init());
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      padRef.current?.off();
      padRef.current = null;
    };
  }, [open]);

  async function handleConfirm() {
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error("Dibuja tu firma antes de continuar");
      return;
    }
    setSubmitting(true);
    try {
      const signatureDataUrl = padRef.current.toDataURL("image/png");
      await onConfirm(signatureDataUrl);
      onOpenChange(false);
    } catch {
      // onConfirm already surfaced its own error toast — keep the
      // dialog open (and the drawn signature intact) so the user can
      // just retry instead of redrawing from scratch.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <canvas ref={canvasRef} className="h-40 w-full touch-none rounded-md border border-border bg-white" />
          <button
            type="button"
            onClick={() => padRef.current?.clear()}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Borrar y firmar de nuevo
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
