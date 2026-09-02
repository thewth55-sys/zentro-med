"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { PlanGate } from "@/components/billing-platform/plan-gate";
import { IntakeFormBuilder } from "@/components/settings/intake-form/intake-form-builder";
import type { Doctor } from "@/types";

/**
 * Top-level route (not a Settings tab) — a multi-page/multi-rule
 * builder doesn't fit in a Dialog. Loads the doctor row directly via
 * the Supabase client (RLS already scopes reads to account members
 * and writes to admins, same as `doctor-manager.tsx` itself) rather
 * than a bespoke API route.
 */
export default function DoctorIntakeFormPage() {
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, name, specialty, intake_form_config")
        .eq("id", params.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setDoctor(data as Doctor);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !doctor) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">No se encontró ese médico.</p>
        <Link href="/settings?tab=scheduling" className="text-sm text-primary hover:opacity-80">
          Volver a Ajustes
        </Link>
      </div>
    );
  }

  return (
    <PlanGate feature="intake_forms" featureLabel="Formulario de admisión de pacientes">
      <div className="max-w-3xl space-y-6">
        <div>
          <Link
            href="/settings?tab=scheduling"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Ajustes → Agenda
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Formulario de admisión — {doctor.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preguntas de pre-evaluación que se muestran a un paciente nuevo antes de confirmar su cita en
            línea con {doctor.name}. Un paciente que ya está en tu lista de contactos no las vuelve a ver.
          </p>
        </div>
        <IntakeFormBuilder doctorId={doctor.id} initialConfig={doctor.intake_form_config ?? null} />
      </div>
    </PlanGate>
  );
}
