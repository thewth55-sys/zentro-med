"use client";

import { useMemo } from "react";
import type { Deal } from "@/types";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PipelineAnalyticsProps {
  deals: Deal[];
}

export function PipelineAnalytics({ deals }: PipelineAnalyticsProps) {
  const t = useTranslations("Pipelines.analytics");
  const { defaultCurrency } = useAuth();

  const stats = useMemo(() => {
    // "Prospectos activos" / "Valor potencial" — open deals only; once
    // a deal is won it's a realized patient, not potential value still
    // being worked.
    const openOnly = deals.filter((d) => d.status === "open");
    const prospectsActive = openOnly.length;
    const potentialValue = openOnly.reduce((sum, d) => sum + Number(d.value || 0), 0);

    // "Conversión a paciente" — won / (won + lost) across this
    // pipeline's whole life, same won/(won+lost) ratio the dashboard
    // already uses for its own 30-day conversion-rate widget
    // (src/lib/dashboard/queries.ts), just not time-windowed — this
    // card reads as "how healthy is this funnel overall," not "this
    // month." `null` (not 0%) when nothing's closed yet, since a 0%
    // rate would misleadingly read as "everything is being lost."
    const closedDeals = deals.filter((d) => d.status === "won" || d.status === "lost");
    const wonCount = deals.filter((d) => d.status === "won").length;
    const conversionRate = closedDeals.length > 0 ? Math.round((wonCount / closedDeals.length) * 100) : null;

    // "Sin seguimiento +3 días" — open deals whose updated_at (bumped
    // only on a real stage/status/field change, see deals' set_updated_at
    // trigger — never on a mere read) is more than 3 days old.
    const threeDaysAgo = new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000);
    const noFollowUpCount = openOnly.filter((d) => {
      const ts = d.updated_at ?? d.created_at;
      return ts ? new Date(ts) < threeDaysAgo : false;
    }).length;

    return { prospectsActive, potentialValue, conversionRate, noFollowUpCount };
  }, [deals]);

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HeroMetric
          label={t("prospectsActive")}
          value={String(stats.prospectsActive)}
          tooltip={t("prospectsActiveTooltip")}
          t={t}
        />
        <HeroMetric
          label={t("potentialValue")}
          value={formatCurrency(stats.potentialValue, defaultCurrency)}
          tooltip={t("potentialValueTooltip")}
          t={t}
        />
        <HeroMetric
          label={t("conversionToPatient")}
          value={stats.conversionRate === null ? t("noDataYet") : `${stats.conversionRate}%`}
          valueClassName={stats.conversionRate !== null ? "text-primary" : undefined}
          tooltip={t("conversionToPatientTooltip")}
          t={t}
        />
        <HeroMetric
          label={t("noFollowUp")}
          value={String(stats.noFollowUpCount)}
          valueClassName={stats.noFollowUpCount > 0 ? "text-amber-500" : undefined}
          tooltip={t("noFollowUpTooltip")}
          t={t}
        />
      </div>
    </TooltipProvider>
  );
}

/** The 4 headline cards (mockup-matching). */
function HeroMetric({
  label,
  value,
  valueClassName,
  tooltip,
  t,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  tooltip: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={t("howCalculated", { label })}
                className="ml-auto text-muted-foreground hover:text-foreground focus:outline-none"
              />
            }
          >
            <Info className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-left">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
      <p className={cn("mt-1.5 text-2xl font-bold text-foreground", valueClassName)}>{value}</p>
    </div>
  );
}
