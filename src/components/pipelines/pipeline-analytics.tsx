"use client";

import { useMemo } from "react";
import type { Deal, PipelineStage } from "@/types";
import {
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  Trophy,
  XCircle,
  Info,
} from "lucide-react";
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
  stages: PipelineStage[];
  deals: Deal[];
}

/**
 * Weighted pipeline value: value × per-stage probability.
 * First stage ≈ 10%, stages interpolate up to 90% before the final stage,
 * final stage (Won) = 100%. Lost deals excluded.
 */
function computeStageProbability(
  stage: PipelineStage,
  sortedStages: PipelineStage[],
): number {
  const n = sortedStages.length;
  if (n <= 1) return 1;
  const index = sortedStages.findIndex((s) => s.id === stage.id);
  if (index < 0) return 0;
  if (index === n - 1) return 1;
  const slots = n - 1;
  if (slots <= 1) return 0.1;
  const t = index / (slots - 1);
  return 0.1 + t * (0.9 - 0.1);
}

export function PipelineAnalytics({ stages, deals }: PipelineAnalyticsProps) {
  const t = useTranslations("Pipelines.analytics");
  const { defaultCurrency } = useAuth();
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  const stats = useMemo(() => {
    const active = deals.filter((d) => d.status !== "lost");
    const openDeals = active.filter((d) => d.status !== "won");

    const totalCount = active.length;
    const totalValue = active.reduce((sum, d) => sum + Number(d.value || 0), 0);
    const avgValue = totalCount > 0 ? totalValue / totalCount : 0;

    const stageById = new Map(sortedStages.map((s) => [s.id, s]));
    const weightedValue = openDeals.reduce((sum, d) => {
      const stage = stageById.get(d.stage_id);
      if (!stage) return sum;
      const prob = computeStageProbability(stage, sortedStages);
      return sum + Number(d.value || 0) * prob;
    }, 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = (d: Deal) => {
      const ts = d.updated_at ?? d.created_at;
      return ts ? new Date(ts) >= monthStart : false;
    };
    const wonThisMonth = deals.filter(
      (d) => d.status === "won" && thisMonth(d),
    ).length;
    const lostThisMonth = deals.filter(
      (d) => d.status === "lost" && thisMonth(d),
    ).length;

    // "Prospectos activos" / "Valor potencial" — open deals only. Not
    // the same thing as totalCount/totalValue above (those also count
    // Won deals): once a deal is won it's a realized patient, not
    // potential value still being worked.
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
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const noFollowUpCount = openOnly.filter((d) => {
      const ts = d.updated_at ?? d.created_at;
      return ts ? new Date(ts) < threeDaysAgo : false;
    }).length;

    return {
      totalCount,
      totalValue,
      avgValue,
      weightedValue,
      wonThisMonth,
      lostThisMonth,
      prospectsActive,
      potentialValue,
      conversionRate,
      noFollowUpCount,
    };
  }, [deals, sortedStages]);

  return (
    <TooltipProvider>
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card/60 p-4 sm:grid-cols-3 xl:grid-cols-6">
        <Metric
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          label={t("totalDeals")}
          value={String(stats.totalCount)}
          tooltip={t("totalDealsTooltip")}
          t={t}
        />
        <Metric
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          label={t("pipelineValue")}
          value={formatCurrency(stats.totalValue, defaultCurrency)}
          tooltip={t("pipelineValueTooltip")}
          t={t}
        />
        <Metric
          icon={<Target className="h-4 w-4 text-blue-400" />}
          label={t("avgDealSize")}
          value={formatCurrency(stats.avgValue, defaultCurrency)}
          tooltip={t("avgDealSizeTooltip")}
          t={t}
        />
        <Metric
          icon={<TrendingUp className="h-4 w-4 text-purple-400" />}
          label={t("weightedValue")}
          value={formatCurrency(stats.weightedValue, defaultCurrency)}
          tooltip={t("weightedValueTooltip")}
          t={t}
        />
        <Metric
          icon={<Trophy className="h-4 w-4 text-primary" />}
          label={t("wonThisMonth")}
          value={String(stats.wonThisMonth)}
          tooltip={t("wonThisMonthTooltip")}
          t={t}
        />
        <Metric
          icon={<XCircle className="h-4 w-4 text-red-400" />}
          label={t("lostThisMonth")}
          value={String(stats.lostThisMonth)}
          tooltip={t("lostThisMonthTooltip")}
          t={t}
        />
      </div>
    </TooltipProvider>
  );
}

/** The 4 headline cards (mockup-matching) — bigger number, less
 *  icon-heavy than the smaller `Metric` cards below them. */
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

function Metric({
  icon,
  label,
  value,
  tooltip,
  t,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tooltip: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
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
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
