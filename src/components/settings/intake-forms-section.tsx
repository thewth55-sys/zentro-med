'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Loader2, UserRound } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { hasIntakeFormContent, type IntakeFormConfig } from '@/lib/intake-forms/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DoctorRow {
  id: string;
  name: string;
  specialty: string | null;
  intake_form_config: IntakeFormConfig | null;
}

/**
 * Entry point for each doctor's intake-form builder, surfaced inside
 * Página de reserva (not buried as a small icon in Ajustes → Agenda →
 * Doctores) — the questionnaire only matters in the context of the
 * public booking flow, so that's where a clinic admin looks for it.
 * doctor-manager.tsx keeps its own icon too as a secondary shortcut
 * for whoever's already there managing doctors.
 */
export function IntakeFormsSection() {
  const { accountId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);

  useEffect(() => {
    if (authLoading || !accountId) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('doctors')
        .select('id, name, specialty, intake_form_config')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('name');
      if (!cancelled) {
        setDoctors((data ?? []) as DoctorRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, accountId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ClipboardList className="size-4 text-primary" />
          Formulario de admisión
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Preguntas de pre-evaluación por médico (dependen de su especialidad). Un paciente nuevo las
          contesta antes de confirmar su cita en línea; un paciente que ya está en tus contactos no las
          vuelve a ver.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : doctors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Agrega un médico activo en Ajustes → Agenda para poder configurarle un formulario.
          </p>
        ) : (
          <div className="space-y-2">
            {doctors.map((doctor) => {
              const configured = hasIntakeFormContent(doctor.intake_form_config);
              return (
                <div
                  key={doctor.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <UserRound className="size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-foreground">{doctor.name}</p>
                      {doctor.specialty && <p className="text-xs text-muted-foreground">{doctor.specialty}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {configured ? 'Configurado' : 'Sin configurar'}
                    </span>
                    <Button variant="outline" size="sm" render={<Link href={`/settings/doctors/${doctor.id}/intake-form`} />}>
                      {configured ? 'Editar' : 'Configurar'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
