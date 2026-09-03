"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, TrendingUp, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { loadNoShowRiskByWeekday, type NoShowByWeekday } from "@/lib/dashboard/queries";
import { usePatientsWithoutNextAppointment } from "@/hooks/use-patients-without-next-appointment";
import { CopilotInsightCard } from "@/components/copilot/copilot-insight-card";

const WEEKDAY_ES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/**
 * "Lo que Zen detectó" — 2 señales reales (no 4, como el mockup):
 * Oportunidad (mismo dato que Prioridades de hoy del dashboard, vía
 * el hook compartido) y Riesgo (inasistencias por día de la semana).
 * Las otras 2 categorías del mockup (ocupación por franja horaria,
 * conversión por canal) se descartaron — no hay backing honesto en
 * el esquema para la mayoría de las cuentas (ver plan).
 */
export function CopilotInsightsPanel() {
  const { patients: patientsWithoutNext, loading: patientsLoading } = usePatientsWithoutNextAppointment();

  const [noShowByWeekday, setNoShowByWeekday] = useState<NoShowByWeekday[] | null>(null);
  const [noShowLoading, setNoShowLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadNoShowRiskByWeekday(createClient())
      .then((r) => {
        if (!cancelled) setNoShowByWeekday(r);
      })
      .catch(() => {
        if (!cancelled) setNoShowByWeekday([]);
      })
      .finally(() => {
        if (!cancelled) setNoShowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = patientsLoading || noShowLoading;

  const worstWeekday = (noShowByWeekday ?? []).reduce<NoShowByWeekday | null>((worst, day) => {
    if (day.currentMonthCount === 0) return worst;
    if (!worst || day.currentMonthCount > worst.currentMonthCount) return day;
    return worst;
  }, null);

  const hasOpportunity = (patientsWithoutNext?.length ?? 0) > 0;
  const hasRisk = worstWeekday !== null;
  const hasContent = hasOpportunity || hasRisk;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        Lo que Zen detectó
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : !hasContent ? (
        <p className="mt-3 text-sm text-muted-foreground">Sin señales por ahora. Todo se ve en orden.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {hasOpportunity && (
            <CopilotInsightCard
              icon={CalendarPlus}
              category="Oportunidad"
              title={`${patientsWithoutNext!.length} paciente${patientsWithoutNext!.length === 1 ? "" : "s"} con presupuesto aceptado sin próxima cita`}
              detail="Tienen un tratamiento aprobado pero no hay cita futura agendada."
              href="/agenda"
              linkLabel="Agendar"
            />
          )}
          {hasRisk && (
            <CopilotInsightCard
              icon={TrendingUp}
              category="Riesgo"
              title={`Inasistencias concentradas los ${WEEKDAY_ES[worstWeekday!.mondayIndex]}`}
              detail={`${worstWeekday!.currentMonthCount} este mes · ${worstWeekday!.previousMonthCount} el mes pasado`}
              href="/agenda"
              linkLabel="Ver agenda"
            />
          )}
        </div>
      )}
    </section>
  );
}
