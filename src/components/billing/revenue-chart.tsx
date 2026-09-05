"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { loadMonthlyRevenue } from "@/lib/dashboard/queries";
import type { MonthlyRevenuePoint } from "@/lib/dashboard/types";
import { BarChart } from "@/components/tremor/bar-chart";

const MONTHS = 6;

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
}

/**
 * "Cobrado vs facturado" — últimos 6 meses, independiente del
 * selector de periodo de arriba (ese filtra las tarjetas de un solo
 * mes/rango; esta gráfica siempre muestra la tendencia reciente,
 * igual que su análoga compacta en el dashboard — ver
 * monthly-revenue-card.tsx).
 */
export function RevenueChart() {
  const t = useTranslations("Billing.revenueChart");
  const { defaultCurrency } = useAuth();
  const [data, setData] = useState<MonthlyRevenuePoint[] | null>(null);

  useEffect(() => {
    const db = createClient();
    void loadMonthlyRevenue(db, MONTHS)
      .then(setData)
      .catch((err) => console.error("[billing] revenue chart load error:", err));
  }, []);

  const chartData = (data ?? []).map((p) => ({
    month: monthLabel(p.month),
    [t("invoiced")]: p.invoiced,
    [t("collected")]: p.collected,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart3 className="size-4" />
        </span>
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
      </div>
      {data === null ? (
        <div className="h-[240px] animate-pulse rounded-lg bg-muted" />
      ) : (
        <BarChart
          data={chartData}
          index="month"
          categories={[t("invoiced"), t("collected")]}
          colors={["blue", "emerald"]}
          valueFormatter={(value) => formatCurrency(value, defaultCurrency)}
          yAxisWidth={64}
          className="h-[240px]"
        />
      )}
    </div>
  );
}
