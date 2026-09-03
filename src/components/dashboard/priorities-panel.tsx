"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, CalendarPlus, FileText, Sparkles } from "lucide-react";

import type { TodayAppointmentItem } from "@/lib/dashboard/types";

interface SentQuote {
  id: string;
  total: number;
  contact: { name: string | null; phone: string } | null;
}

interface AcceptedQuote {
  id: string;
  contact_id: string;
  updated_at: string;
  contact: { name: string | null; phone: string } | null;
}

/**
 * Replaces the "Recomendaciones de Zen" band that used to live inside
 * DashboardHero — same visual language (soft-primary card, Sparkles
 * icon) but with real, actionable signals instead of a static tip
 * string: unconfirmed appointments today (already in memory, no query)
 * and quotes awaiting the patient's response (existing
 * `/api/billing/quotes?status=sent` endpoint, nothing new on the
 * backend). "El panel propone el siguiente paso" instead of a
 * generic summary.
 */
export function PrioritiesPanel({
  todayAppointments,
  loading,
}: {
  todayAppointments: TodayAppointmentItem[] | null;
  loading: boolean;
}) {
  const [sentQuotes, setSentQuotes] = useState<SentQuote[] | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(true);

  // Pacientes con un presupuesto aceptado pero sin ninguna cita futura
  // agendada — cruce honesto de `quotes.status=accepted` (deduplicado
  // por paciente, quedándose con el más reciente) contra
  // `/api/appointments?from=<ahora>`. No hay tabla de "plan de
  // tratamiento" ni de "fase" en el esquema (confirmado antes de
  // construir esto), así que el ítem se limita a lo que sí es real:
  // el presupuesto aceptado y la ausencia de próxima cita.
  const [patientsWithoutNext, setPatientsWithoutNext] = useState<AcceptedQuote[] | null>(null);
  const [acceptedLoading, setAcceptedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/quotes?status=sent")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSentQuotes(data.quotes ?? []);
      })
      .catch(() => {
        if (!cancelled) setSentQuotes([]);
      })
      .finally(() => {
        if (!cancelled) setQuotesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const nowIso = new Date().toISOString();
    Promise.all([
      fetch("/api/billing/quotes?status=accepted").then((res) => res.json()),
      fetch(`/api/appointments?from=${encodeURIComponent(nowIso)}`).then((res) => res.json()),
    ])
      .then(([quotesData, apptData]) => {
        if (cancelled) return;
        const accepted = (quotesData.quotes ?? []) as AcceptedQuote[];
        const futureContactIds = new Set(
          ((apptData.appointments ?? []) as Array<{ contact_id: string | null; status: string }>)
            .filter((a) => a.status !== "cancelled" && a.contact_id)
            .map((a) => a.contact_id as string),
        );
        const byContact = new Map<string, AcceptedQuote>();
        for (const q of accepted) {
          if (!q.contact_id) continue;
          const existing = byContact.get(q.contact_id);
          if (!existing || new Date(q.updated_at) > new Date(existing.updated_at)) {
            byContact.set(q.contact_id, q);
          }
        }
        setPatientsWithoutNext(
          Array.from(byContact.values()).filter((q) => !futureContactIds.has(q.contact_id)),
        );
      })
      .catch(() => {
        if (!cancelled) setPatientsWithoutNext([]);
      })
      .finally(() => {
        if (!cancelled) setAcceptedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stillLoading = loading || quotesLoading || acceptedLoading;
  const pendingAppointments = (todayAppointments ?? []).filter((a) => a.status === "pending");
  const hasContent =
    pendingAppointments.length > 0 ||
    (sentQuotes?.length ?? 0) > 0 ||
    (patientsWithoutNext?.length ?? 0) > 0;

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        Prioridades de hoy
      </div>

      {stillLoading ? (
        <div className="mt-3 space-y-2">
          <div className="h-10 animate-pulse rounded-lg bg-primary/10" />
          <div className="h-10 animate-pulse rounded-lg bg-primary/10" />
        </div>
      ) : !hasContent ? (
        <p className="mt-3 text-sm text-muted-foreground">Todo al día. No hay pendientes urgentes.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pendingAppointments.length > 0 && (
            <li className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CalendarClock className="size-4 shrink-0 text-amber-500" />
                {pendingAppointments.length} cita{pendingAppointments.length === 1 ? "" : "s"} sin confirmar
                hoy
              </div>
              <Link href="/agenda" className="shrink-0 text-xs font-medium text-primary hover:text-primary/80">
                Ver agenda
              </Link>
            </li>
          )}
          {(sentQuotes?.length ?? 0) > 0 && (
            <li className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <FileText className="size-4 shrink-0 text-amber-500" />
                {sentQuotes!.length} presupuesto{sentQuotes!.length === 1 ? "" : "s"} esperando respuesta
              </div>
              <Link href="/billing" className="shrink-0 text-xs font-medium text-primary hover:text-primary/80">
                Ver finanzas
              </Link>
            </li>
          )}
          {(patientsWithoutNext?.length ?? 0) > 0 && (
            <li className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CalendarPlus className="size-4 shrink-0 text-amber-500" />
                {patientsWithoutNext!.length} paciente{patientsWithoutNext!.length === 1 ? "" : "s"} con
                presupuesto aceptado sin próxima cita
              </div>
              <Link href="/agenda" className="shrink-0 text-xs font-medium text-primary hover:text-primary/80">
                Agendar
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
