"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { loadTopTreatments, type TopTreatment } from "@/lib/billing/analytics";

const LIMIT = 5;

/**
 * "Tratamientos más facturados" — mismo rango de fechas que las
 * tarjetas de arriba (from/to vienen del selector de periodo de
 * FinancialSummary), agrupado por producto vinculado o, si la línea
 * es texto libre sin producto, por su descripción tal cual.
 */
export function TopTreatmentsCard({ from, to }: { from: string | null; to: string | null }) {
  const t = useTranslations("Billing.topTreatments");
  const { defaultCurrency } = useAuth();
  const [items, setItems] = useState<TopTreatment[] | null>(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(null);
    const db = createClient();
    void loadTopTreatments(db, from, to, LIMIT)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((err) => console.error("[billing] top treatments load error:", err));
    return () => {
      active = false;
    };
  }, [from, to]);

  const maxTotal = Math.max(1, ...(items ?? []).map((i) => i.total));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Trophy className="size-4" />
        </span>
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
      </div>

      {items === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-foreground">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                  {item.label}
                </span>
                <span className="shrink-0 font-medium text-foreground">
                  {formatCurrency(item.total, defaultCurrency)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((item.total / maxTotal) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
