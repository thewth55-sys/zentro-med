"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, CreditCard, Loader2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types";

interface AccountStatusPanelProps {
  contactId: string;
  currency: string;
  onRequestPayment: (invoiceId: string) => void;
  onSendReminder: () => void;
}

interface AccountTotals {
  approvedPlan: number;
  invoiced: number;
  collected: number;
  balance: number;
  /** Facturas no draft/void, más antigua primero — misma base que "Facturado"/"Cobrado". */
  billableInvoices: Invoice[];
  oldestPendingInvoiceId: string | null;
}

/**
 * "Estado de cuenta" + "Plan de pagos" — reutiliza exactamente las
 * mismas rutas/columnas que ya usan InvoiceList (facturas) y QuoteList
 * (cotizaciones aceptadas), solo agregadas aquí. Ningún dato inventado:
 * - Plan aprobado = suma de `quotes.total` con status 'accepted'.
 * - Facturado / Cobrado = suma de `total` / `amount_paid` sobre
 *   facturas no draft/void (mismo filtro que el chip "Saldo" del
 *   encabezado del paciente).
 * - "Plan de pagos" muestra esas mismas facturas como una lista de
 *   pendiente/pagada — el esquema no tiene fechas de "mensualidad"
 *   planeadas (quote_phases no tiene columna de fecha), así que no se
 *   inventan cuotas con fechas: cada renglón es una factura real.
 */
export function AccountStatusPanel({
  contactId,
  currency,
  onRequestPayment,
  onSendReminder,
}: AccountStatusPanelProps) {
  const t = useTranslations("Contacts.detailView.accountStatus");
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<AccountTotals | null>(null);

  const fetchTotals = useCallback(async () => {
    setLoading(true);
    try {
      const [invoicesRes, quotesRes] = await Promise.all([
        fetch(`/api/billing/invoices?contact_id=${contactId}`),
        fetch(`/api/billing/quotes?contact_id=${contactId}`),
      ]);
      const invoicesJson = await invoicesRes.json();
      const quotesJson = await quotesRes.json();
      const invoices = (invoicesJson.invoices ?? []) as Invoice[];
      const quotes = (quotesJson.quotes ?? []) as Array<{ status: string; total: number | string }>;

      const billableInvoices = invoices
        .filter((inv) => inv.status !== "draft" && inv.status !== "void")
        .sort((a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime());
      const invoiced = billableInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
      const collected = billableInvoices.reduce((sum, inv) => sum + Number(inv.amount_paid), 0);
      const approvedPlan = quotes
        .filter((q) => q.status === "accepted")
        .reduce((sum, q) => sum + Number(q.total), 0);
      const oldestPending = billableInvoices.find((inv) => inv.status !== "paid") ?? null;

      setTotals({
        approvedPlan,
        invoiced,
        collected,
        balance: invoiced - collected,
        billableInvoices,
        oldestPendingInvoiceId: oldestPending?.id ?? null,
      });
    } catch (err) {
      console.error("[account-status-panel] failed to load totals:", err);
      setTotals(null);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void fetchTotals();
  }, [fetchTotals]);

  const money = useCallback(
    (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value),
    [currency],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!totals) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3.5 text-sm font-bold text-foreground">{t("title")}</h3>
        <div className="flex flex-col gap-2.5 text-[13px]">
          {totals.approvedPlan > 0 && (
            <Row label={t("approvedPlan")} value={money(totals.approvedPlan)} />
          )}
          <Row label={t("invoiced")} value={money(totals.invoiced)} />
          <Row label={t("collected")} value={money(totals.collected)} valueClassName="text-primary" />
          <div className="h-px bg-border" />
          <Row label={t("balance")} value={money(totals.balance)} bold />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            size="sm"
            className="w-full"
            disabled={!totals.oldestPendingInvoiceId}
            onClick={() => totals.oldestPendingInvoiceId && onRequestPayment(totals.oldestPendingInvoiceId)}
          >
            <CreditCard className="size-3.5" />
            {t("recordPayment")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={onSendReminder}
            disabled={totals.balance <= 0}
          >
            <MessageCircle className="size-3.5" />
            {t("sendReminder")}
          </Button>
        </div>
      </div>

      {totals.billableInvoices.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">{t("paymentPlanTitle")}</h3>
          <div className="flex flex-col gap-2.5">
            {totals.billableInvoices.map((inv) => {
              const paid = inv.status === "paid";
              return (
                <div key={inv.id} className="flex items-center gap-2.5 text-[13px]">
                  <CheckCircle2
                    className={cn("size-4 shrink-0", paid ? "text-primary" : "text-muted-foreground/30")}
                  />
                  <span className={cn("flex-1 truncate", !paid && "text-muted-foreground")}>
                    {inv.invoice_number}
                  </span>
                  <span className="tabular-nums font-medium">{money(Number(inv.total))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  valueClassName,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", bold ? "text-sm font-bold text-foreground" : "font-semibold", valueClassName)}>
        {value}
      </span>
    </div>
  );
}
