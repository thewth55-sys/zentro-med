"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntakeFormConfig } from "@/lib/intake-forms/types";

export interface IdentifyResult {
  phone: string;
  email: string;
  found: boolean;
  hasName: boolean;
  intakeFormConfig: IntakeFormConfig | null;
}

/**
 * "¿Ya te conocemos?" — asks for phone (required, same as before) and
 * email (optional), then asks the server whether a contact already
 * exists for this account. The server never echoes back identity
 * (see lookup-patient/route.ts) — just found/hasName plus, for a new
 * patient, the doctor's intake form (if any), saving a round-trip.
 */
export function IdentifyStep({
  slug,
  doctorId,
  onResolved,
  onBack,
}: {
  slug: string;
  doctorId: string;
  onResolved: (result: IdentifyResult) => void;
  onBack: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = phone.trim().length >= 8;

  async function handleContinue() {
    if (!canContinue) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/booking/${encodeURIComponent(slug)}/lookup-patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email: email || undefined, doctor_id: doctorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo continuar. Intenta de nuevo.");
        return;
      }
      onResolved({
        phone,
        email,
        found: !!data.found,
        hasName: !!data.hasName,
        intakeFormConfig: data.intake_form_config ?? null,
      });
    } catch {
      setError("No se pudo continuar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="booking-phone">Teléfono (WhatsApp)</Label>
        <Input
          id="booking-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="55 1234 5678"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="booking-email">Correo (opcional)</Label>
        <Input id="booking-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Atrás
        </Button>
        <Button type="button" onClick={handleContinue} disabled={!canContinue || loading} className="rounded-full">
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Continuar
        </Button>
      </div>
    </div>
  );
}
