'use client';

// ============================================================
// /firmar/[token] — public informed-consent signing page. No auth;
// the signer is a patient following an emailed link.
//
// Flow:
//   peek (read document + masked email)
//     → "Enviar código" (send-otp)
//       → enter 6-digit code (verify-otp)
//         → draw signature + name (submit)
//           → done
//
// Each step re-validates server-side (expired/already-signed/etc are
// all real states the API can return at any point, not just the
// first load) — this page just reflects whatever the API says.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import SignaturePad from 'signature_pad';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Step = 'loading' | 'error' | 'already_signed' | 'ready' | 'otp_sent' | 'verified' | 'done';

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'Este enlace no es válido.',
  expired: 'Este enlace ya venció — pide a tu consultorio que te envíe uno nuevo.',
  server_error: 'Ocurrió un error. Intenta de nuevo en unos minutos.',
};

export default function SignDocumentPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [step, setStep] = useState<Step>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');

  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [signerName, setSignerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/sign/${token}/peek`);
        const data = await res.json();
        if (!data.ok) {
          setStep('error');
          setErrorMessage(REASON_MESSAGES[data.reason] ?? REASON_MESSAGES.server_error);
          return;
        }
        setTitle(data.title);
        setContent(data.content ?? '');
        setPdfUrl(data.pdf_url ?? null);
        setMaskedEmail(data.delivered_to_email_masked ?? '');
        setStep(data.already_signed ? 'already_signed' : 'ready');
      } catch {
        setStep('error');
        setErrorMessage(REASON_MESSAGES.server_error);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (step !== 'verified' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    // Match the canvas's backing resolution to its displayed size so
    // strokes aren't blurry/offset on high-DPI screens.
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
    padRef.current = new SignaturePad(canvas, { backgroundColor: '#ffffff' });
    return () => {
      padRef.current?.off();
      padRef.current = null;
    };
  }, [step]);

  async function handleSendOtp() {
    setSendingOtp(true);
    try {
      const res = await fetch(`/api/sign/${token}/send-otp`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) {
        toast.error(REASON_MESSAGES[data.reason] ?? 'No se pudo enviar el código');
        return;
      }
      toast.success(`Código enviado a ${maskedEmail}`);
      setStep('otp_sent');
    } catch {
      toast.error('No se pudo enviar el código');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    setVerifyingOtp(true);
    try {
      const res = await fetch(`/api/sign/${token}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        const messages: Record<string, string> = {
          invalid_code: 'Código incorrecto.',
          otp_expired: 'El código venció — pide uno nuevo.',
          too_many_attempts: 'Demasiados intentos — pide un código nuevo.',
          already_signed: 'Este documento ya fue firmado.',
          expired: REASON_MESSAGES.expired,
        };
        toast.error(messages[data.reason] ?? 'No se pudo verificar el código');
        return;
      }
      setStep('verified');
    } catch {
      toast.error('No se pudo verificar el código');
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleSubmit() {
    if (!signerName.trim()) {
      toast.error('Escribe tu nombre completo');
      return;
    }
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error('Dibuja tu firma antes de continuar');
      return;
    }
    setSubmitting(true);
    try {
      const signatureDataUrl = padRef.current.toDataURL('image/png');
      const res = await fetch(`/api/sign/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerName: signerName.trim(), signatureDataUrl }),
      });
      const data = await res.json();
      if (!data.ok) {
        const messages: Record<string, string> = {
          already_signed: 'Este documento ya fue firmado.',
          expired: REASON_MESSAGES.expired,
          otp_not_verified: 'Tu verificación venció — vuelve a solicitar el código.',
          empty_signature: 'Dibuja tu firma antes de continuar',
        };
        toast.error(messages[data.reason] ?? 'No se pudo guardar la firma');
        return;
      }
      setStep('done');
    } catch {
      toast.error('No se pudo guardar la firma');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl text-foreground">
            {step === 'loading' ? 'Cargando…' : title || 'Documento para firmar'}
          </CardTitle>
          {step !== 'loading' && step !== 'error' && (
            <CardDescription className="text-muted-foreground">
              Firma electrónica con verificación por correo
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'loading' && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          )}

          {step === 'already_signed' && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">Este documento ya fue firmado. No se requiere ninguna acción.</p>
            </div>
          )}

          {(step === 'ready' || step === 'otp_sent') && (
            <>
              {pdfUrl ? (
                <iframe src={pdfUrl} title={title} className="h-96 w-full rounded-md border border-border" />
              ) : (
                <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground">
                  {content}
                </div>
              )}

              {step === 'ready' && (
                <Button onClick={handleSendOtp} disabled={sendingOtp} className="w-full">
                  {sendingOtp && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enviar código de verificación a {maskedEmail}
                </Button>
              )}

              {step === 'otp_sent' && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Código de verificación</Label>
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    className="text-center text-lg tracking-widest"
                  />
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otpCode.length !== 6}
                    className="w-full"
                  >
                    {verifyingOtp && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verificar código
                  </Button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                  >
                    Reenviar código
                  </button>
                </div>
              )}
            </>
          )}

          {step === 'verified' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nombre completo</Label>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Tu nombre completo" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Firma</Label>
                <canvas
                  ref={canvasRef}
                  className="h-40 w-full touch-none rounded-md border border-border bg-white"
                />
                <button
                  type="button"
                  onClick={() => padRef.current?.clear()}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Borrar y firmar de nuevo
                </button>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Firmar documento
              </Button>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium text-foreground">¡Documento firmado exitosamente!</p>
              <p className="text-xs text-muted-foreground">Ya puedes cerrar esta ventana.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
