"use client";

import { useMemo } from "react";
import { Receipt } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import type { MonthlyRevenuePoint } from "@/lib/dashboard/types";
import { Skeleton } from "./skeleton";

interface Props {
  data: MonthlyRevenuePoint[] | null;
  loading: boolean;
}

const VB_W = 260;
const VB_H = 64;
const BAR_GAP = 4;

/**
 * "Ingresos del mes" — reemplaza el MetricCard genérico de
 * `revenueCollectedRatio` en el rail derecho por el mismo par
 * facturado/cobrado/pendiente que ya usa `financial-summary.tsx`,
 * más una barra por mes (últimos 8) y el delta vs. el mes anterior.
 * Todo sobre `invoices` real — ver `loadMonthlyRevenue`.
 */
export function MonthlyRevenueCard({ data, loading }: Props) {
  const t = useTranslations("Dashboard.monthlyRevenue");
  const { defaultCurrency } = useAuth();

  const current = data?.[data.length - 1] ?? null;
  const previous = data && data.length > 1 ? data[data.length - 2] : null;

  const deltaPct = useMemo(() => {
    if (!current || !previous || previous.collected === 0) return null;
    return Math.round(((current.collected - previous.collected) / previous.collected) * 1000) / 10;
  }, [current, previous]);

  const maxCollected = useMemo(
    () => Math.max(1, ...(data ?? []).map((p) => p.collected)),
    [data],
  );

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-8 w-40" />
        <Skeleton className="mt-4 h-16 w-full" />
      </div>
    );
  }

  const pending = current ? Math.max(0, current.invoiced - current.collected) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Receipt className="size-4" />
          </span>
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        </div>
        {deltaPct !== null && (
          <span
            className={`text-xs font-medium ${deltaPct >= 0 ? "text-emerald-500" : "text-red-500"}`}
          >
            {deltaPct >= 0 ? "+" : ""}
            {deltaPct}% {t("vsLastMonth")}
          </span>
        )}
      </div>

      <p className="mt-2 text-2xl font-bold text-foreground">
        {formatCurrency(current?.collected ?? 0, defaultCurrency)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {t("subtitle", {
          invoiced: formatCurrency(current?.invoiced ?? 0, defaultCurrency),
          pending: formatCurrency(pending, defaultCurrency),
        })}
      </p>

      <MonthlyBars data={data} maxCollected={maxCollected} />
    </div>
  );
}

function MonthlyBars({ data, maxCollected }: { data: MonthlyRevenuePoint[]; maxCollected: number }) {
  const barW = (VB_W - BAR_GAP * (data.length - 1)) / data.length
  const lastIdx = data.length - 1

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H + 14}`} className="mt-4 h-20 w-full" role="img" aria-hidden="true">
      {data.map((p, i) => {
        const h = Math.max(2, (p.collected / maxCollected) * VB_H)
        const x = i * (barW + BAR_GAP)
        const y = VB_H - h
        return (
          <g key={p.month}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2}
              className={i === lastIdx ? "fill-primary" : "fill-muted"}
            />
            <text
              x={x + barW / 2}
              y={VB_H + 12}
              textAnchor="middle"
              className="fill-muted-foreground text-[8px]"
            >
              {monthLabel(p.month)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString(undefined, { month: "short" }).replace(".", "")
}
