"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Quote, QuoteItem } from "@/types";

interface Props {
  contactId: string;
  currency: string;
}

/**
 * "Plan de tratamiento" del mockup — la cotización `accepted` más
 * reciente del paciente, agrupada por fase (migración 106:
 * quote_phases + quote_items.phase_id/completed). Si no hay ninguna
 * cotización aceptada, estado vacío honesto (no se inventa un plan).
 */
export function TreatmentPlanPanel({ contactId, currency }: Props) {
  const t = useTranslations("Contacts.detailView.treatmentPlan");
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await fetch(
        `/api/billing/quotes?contact_id=${encodeURIComponent(contactId)}&status=accepted`,
      );
      const listJson = await listRes.json().catch(() => ({}));
      const candidates = (listJson.quotes ?? []) as Quote[];
      const latest = candidates[0] ?? null; // ya viene ordenado created_at desc
      if (!latest) {
        setQuote(null);
        return;
      }
      const detailRes = await fetch(`/api/billing/quotes/${latest.id}`);
      const detailJson = await detailRes.json().catch(() => ({}));
      setQuote((detailJson.quote as Quote) ?? null);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleCompleted(item: QuoteItem) {
    if (!quote) return;
    setTogglingId(item.id);
    const nextCompleted = !item.completed;
    // Optimista — la ficha se siente instantánea al marcar un tratamiento hecho.
    setQuote((prev) =>
      prev ? { ...prev, items: prev.items?.map((i) => (i.id === item.id ? { ...i, completed: nextCompleted } : i)) } : prev,
    );
    try {
      const res = await fetch(`/api/billing/quotes/${quote.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      // revertir si falló
      setQuote((prev) =>
        prev ? { ...prev, items: prev.items?.map((i) => (i.id === item.id ? { ...i, completed: !nextCompleted } : i)) } : prev,
      );
    } finally {
      setTogglingId(null);
    }
  }

  const grouped = useMemo(() => {
    if (!quote?.items) return [];
    const phases = [...(quote.phases ?? [])].sort((a, b) => a.position - b.position);
    const byPhase = new Map<string, QuoteItem[]>();
    const noPhase: QuoteItem[] = [];
    for (const item of quote.items) {
      if (item.phase_id) {
        (byPhase.get(item.phase_id) ?? byPhase.set(item.phase_id, []).get(item.phase_id)!).push(item);
      } else {
        noPhase.push(item);
      }
    }
    const groups = phases
      .filter((p) => byPhase.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        items: byPhase.get(p.id)!,
        total: byPhase.get(p.id)!.reduce((sum, i) => sum + i.line_total, 0),
      }));
    if (noPhase.length > 0) {
      groups.push({
        id: "none",
        name: t("noPhaseGroup"),
        items: noPhase,
        total: noPhase.reduce((sum, i) => sum + i.line_total, 0),
      });
    }
    return groups;
  }, [quote, t]);

  const progress = useMemo(() => {
    if (!quote?.items || quote.items.length === 0 || quote.total <= 0) return 0;
    const done = quote.items.filter((i) => i.completed).reduce((sum, i) => sum + i.line_total, 0);
    return Math.round((done / quote.total) * 100);
  }, [quote]);

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  if (loading) {
    return (
      <div className="flex justify-center rounded-lg border border-border bg-card p-6">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="mt-2 text-xs text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="text-xs text-muted-foreground">
          {quote.approved_at ? `${t("approvedOn", { date: dateFormatter.format(new Date(quote.approved_at)) })} · ` : ""}
          <span className="font-medium text-foreground">{formatCurrency(quote.total, currency)}</span>{" "}
          {t("totalSuffix")}
        </p>
      </div>

      <div className="mt-2.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-right text-xs font-medium text-primary">{t("progress", { percent: progress })}</p>
      </div>

      <div className="mt-4 space-y-4">
        {grouped.map((group, gi) => (
          <div key={group.id}>
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <p className="text-xs font-semibold text-foreground">
                {group.id !== "none" ? `${t("phaseLabel", { number: gi + 1 })} · ` : ""}
                {group.name}
              </p>
              <p className="text-xs font-semibold text-foreground">{formatCurrency(group.total, currency)}</p>
            </div>
            <ul className="divide-y divide-border/60">
              {group.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2.5 py-2">
                  <button
                    type="button"
                    onClick={() => void toggleCompleted(item)}
                    disabled={togglingId === item.id}
                    aria-pressed={item.completed}
                    aria-label={t("markCompleted")}
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors disabled:opacity-60",
                      item.completed
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-transparent hover:border-primary",
                    )}
                  >
                    ✓
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      item.completed ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {item.description}
                  </span>
                  <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
                    {item.odontogram_tooth?.tooth_number ?? "—"}
                  </span>
                  <span className="text-sm text-muted-foreground">{formatCurrency(item.line_total, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
