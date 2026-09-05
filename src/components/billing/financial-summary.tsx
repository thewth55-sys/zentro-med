"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Loader2, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RevenueChart } from "./revenue-chart";
import { TopTreatmentsCard } from "./top-treatments-card";
import type { Expense, ExpenseCategory, Invoice } from "@/types";

type Period = "this_month" | "last_month" | "this_year" | "all_time";

function periodRange(period: Period): { from: string | null; to: string | null } {
  const now = new Date();
  if (period === "all_time") return { from: null, to: null };
  if (period === "this_year") {
    return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  }
  const targetMonth = period === "last_month" ? now.getMonth() - 1 : now.getMonth();
  const from = new Date(now.getFullYear(), targetMonth, 1);
  const to = new Date(now.getFullYear(), targetMonth + 1, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function inRange(dateStr: string, from: string | null, to: string | null): boolean {
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

/**
 * Resumen financiero — phase 1 of the finance module's P&L view.
 * "Cobrado" approximates cash collected as invoice.amount_paid summed
 * over invoices issued in the period (not payments.paid_at) — there's
 * no top-level payments-listing endpoint yet (payments are nested
 * under /api/billing/invoices/[id]/payments), so this is a reasonable
 * phase-1 approximation rather than new API surface for something a
 * later phase (bank accounts / cash flow) will do properly anyway.
 */
export function FinancialSummary() {
  const t = useTranslations("Billing.financialSummary");
  const { defaultCurrency } = useAuth();

  const [period, setPeriod] = useState<Period>("this_month");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invoicesRes, expensesRes] = await Promise.all([
        fetch("/api/billing/invoices"),
        fetch("/api/billing/expenses"),
      ]);
      const invoicesData = await invoicesRes.json();
      const expensesData = await expensesRes.json();
      setInvoices((invoicesData.invoices ?? []) as Invoice[]);
      setExpenses((expensesData.expenses ?? []) as Expense[]);
    } catch (err) {
      console.error("Load financial summary error:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const { from, to } = periodRange(period);
  const invoicesInRange = invoices.filter((inv) => inRange(inv.issue_date, from, to));
  const expensesInRange = expenses.filter((exp) => inRange(exp.expense_date, from, to));

  const totalInvoiced = invoicesInRange.reduce((sum, inv) => sum + inv.total, 0);
  const totalCollected = invoicesInRange.reduce((sum, inv) => sum + inv.amount_paid, 0);
  const totalExpenses = expensesInRange.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalCollected - totalExpenses;
  const collectedPercent = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : null;

  // "Por cobrar" — deliberately scoped to the same period as
  // Facturado/Cobrado right next to it (total - collected for THIS
  // period), not the all-time "saldo" convention used elsewhere
  // (account-status-panel.tsx, use-patients-list.ts) — mixing a
  // period-scoped pair with an all-time third number on the same row
  // would make the three cards not add up, which reads as more
  // confusing than useful here.
  const billableInRange = invoicesInRange.filter((inv) => inv.status !== "draft" && inv.status !== "void");
  const totalDue = billableInRange.reduce((sum, inv) => sum + (inv.total - inv.amount_paid), 0);
  const patientsWithBalance = new Set(
    billableInRange.filter((inv) => inv.total - inv.amount_paid > 0).map((inv) => inv.contact_id),
  ).size;
  const overdueCount = billableInRange.filter((inv) => inv.status === "overdue").length;

  const expensesByCategory = expensesInRange.reduce<Record<string, number>>((acc, exp) => {
    acc[exp.category] = (acc[exp.category] ?? 0) + exp.amount;
    return acc;
  }, {});
  const categoryRows = (Object.entries(expensesByCategory) as [ExpenseCategory, number][]).sort((a, b) => b[1] - a[1]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="this_month">{t("periods.this_month")}</option>
          <option value="last_month">{t("periods.last_month")}</option>
          <option value="this_year">{t("periods.this_year")}</option>
          <option value="all_time">{t("periods.all_time")}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t("invoiced")}
          value={formatCurrency(totalInvoiced, defaultCurrency)}
          icon={Receipt}
          subtitle={t("invoicedSubtitle", { count: invoicesInRange.length })}
        />
        <MetricCard
          title={t("collected")}
          value={formatCurrency(totalCollected, defaultCurrency)}
          icon={TrendingUp}
          subtitle={collectedPercent !== null ? t("collectedSubtitle", { percent: collectedPercent }) : undefined}
        />
        <MetricCard
          title={t("due")}
          value={formatCurrency(totalDue, defaultCurrency)}
          icon={Clock}
          accent={totalDue > 0 ? "amber" : "green"}
          subtitle={t("dueSubtitle", { patients: patientsWithBalance, overdue: overdueCount })}
        />
        <MetricCard
          title={t("netProfit")}
          value={formatCurrency(netProfit, defaultCurrency)}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          subtitle={t("netProfitSubtitle", { amount: formatCurrency(totalExpenses, defaultCurrency) })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueChart />
        <TopTreatmentsCard from={from} to={to} />
      </div>

      {categoryRows.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-medium text-foreground">{t("byCategory")}</p>
          <div className="space-y-2">
            {categoryRows.map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t(`categories.${category}`)}</span>
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(amount, defaultCurrency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
