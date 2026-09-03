"use client";

import { useEffect, useState } from "react";

export interface AcceptedQuote {
  id: string;
  contact_id: string;
  updated_at: string;
  contact: { name: string | null; phone: string } | null;
}

/**
 * Pacientes con un presupuesto aceptado pero sin ninguna cita futura
 * agendada — cruce honesto de `quotes.status=accepted` (deduplicado
 * por paciente, quedándose con el más reciente) contra
 * `/api/appointments?from=<ahora>`. No hay tabla de "plan de
 * tratamiento" ni de "fase" en el esquema (confirmado antes de
 * construir esto), así que la señal se limita a lo que sí es real: el
 * presupuesto aceptado y la ausencia de próxima cita.
 *
 * Extraído de `priorities-panel.tsx` (dashboard) para que
 * `copilot-insights-panel.tsx` muestre exactamente el mismo número
 * sin duplicar la lógica de fetch/dedupe.
 */
export function usePatientsWithoutNextAppointment(): {
  patients: AcceptedQuote[] | null;
  loading: boolean;
} {
  const [patients, setPatients] = useState<AcceptedQuote[] | null>(null);
  const [loading, setLoading] = useState(true);

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
        setPatients(Array.from(byContact.values()).filter((q) => !futureContactIds.has(q.contact_id)));
      })
      .catch(() => {
        if (!cancelled) setPatients([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { patients, loading };
}
