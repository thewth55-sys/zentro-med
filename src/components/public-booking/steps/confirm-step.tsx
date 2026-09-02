"use client";

import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicDepositInfo } from "@/lib/payments/config";

const dateFormatter = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });
const timeFormatter = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" });

export function ConfirmStep({
  doctorName,
  serviceTypeName,
  startAt,
  showNameField,
  name,
  setName,
  deposit,
  depositAmountLabel,
  showTerms,
  setShowTerms,
  error,
  submitting,
  onSubmit,
  onBack,
}: {
  doctorName: string;
  serviceTypeName: string;
  startAt: string;
  /** Only asked for a NEW patient / a returning one with no name on file. */
  showNameField: boolean;
  name: string;
  setName: (v: string) => void;
  deposit: PublicDepositInfo | null;
  depositAmountLabel: string;
  showTerms: boolean;
  setShowTerms: (v: boolean) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const canSubmit = !showNameField || name.trim().length > 1;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <p className="font-medium text-foreground">
          {serviceTypeName} con {doctorName}
        </p>
        <p className="text-muted-foreground">
          {dateFormatter.format(new Date(startAt))} a las {timeFormatter.format(new Date(startAt))}
        </p>
      </div>

      {showNameField && (
        <div className="space-y-2">
          <Label htmlFor="booking-name">Nombre completo</Label>
          <Input id="booking-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}

      {deposit?.enabled && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="flex items-start gap-2 text-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            Para reservar deberás realizar un pago de {depositAmountLabel} como anticipo de tu consulta. Al
            hacer clic en &quot;Confirmar cita&quot; serás dirigido a completar el pago.
          </p>
          {deposit.bookingTerms && (
            <>
              <button
                type="button"
                onClick={() => setShowTerms(!showTerms)}
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                {showTerms ? "Ocultar términos y condiciones" : "Ver términos y condiciones"}
              </button>
              {showTerms && (
                <p className="whitespace-pre-wrap rounded-md bg-background/60 p-3 text-xs text-muted-foreground">
                  {deposit.bookingTerms}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Atrás
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit || submitting} className="rounded-full">
          {submitting ? "Agendando…" : "Confirmar cita"}
        </Button>
      </div>
    </div>
  );
}
