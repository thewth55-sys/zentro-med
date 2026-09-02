"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, FileText, Sparkles } from "lucide-react";

import type { TodayAppointmentItem } from "@/lib/dashboard/types";

interface SentQuote {
  id: string;
  total: number;
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

  const stillLoading = loading || quotesLoading;
  const pendingAppointments = (todayAppointments ?? []).filter((a) => a.status === "pending");
  const hasContent = pendingAppointments.length > 0 || (sentQuotes?.length ?? 0) > 0;

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
        </ul>
      )}
    </section>
  );
}
