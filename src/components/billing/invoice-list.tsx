"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Receipt, Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceForm } from "./invoice-form";
import type { Invoice, InvoiceStatus, PaymentMethod } from "@/types";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  partial: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  overdue: "bg-red-500/10 text-red-400 border-red-500/30",
  void: "bg-muted text-muted-foreground border-border",
};

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "transfer", "other"];

interface InvoiceListProps {
  contactId?: string;
  /** Set by a sibling "Registrar pago" shortcut (see AccountStatusPanel)
   *  to jump straight to that invoice's payment form instead of making
   *  staff find and click the right row. */
  autoOpenInvoiceId?: string | null;
  onAutoOpenHandled?: () => void;
}

export function InvoiceList({ contactId, autoOpenInvoiceId, onAutoOpenHandled }: InvoiceListProps) {
  const t = useTranslations("Billing.invoiceList");
  const router = useRouter();
  const { accountId, defaultCurrency } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  // "Formas de pago" — this month's payments by method. Only shown on
  // the account-wide view (not a single contact's invoice history),
  // so it's skipped entirely when `contactId` is set.
  const [paymentTotals, setPaymentTotals] = useState<Record<PaymentMethod, number> | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (contactId) params.set("contact_id", contactId);
      const res = await fetch(`/api/billing/invoices?${params.toString()}`);
      const data = await res.json();
      setInvoices((data.invoices ?? []) as Invoice[]);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [contactId, t]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  // Direct RLS-scoped read (like contact-form.tsx's dedupe check) —
  // there's no dedicated payments-aggregate endpoint, and this is a
  // one-off small query for the current month, same pragmatic approach
  // financial-summary.tsx already takes for its own numbers.
  const fetchPaymentTotals = useCallback(async () => {
    if (contactId || !accountId) return;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    const { data, error } = await supabase
      .from("payments")
      .select("amount, method")
      .eq("account_id", accountId)
      .gte("paid_at", from)
      .lte("paid_at", to);
    if (error) {
      console.error("Failed to fetch payment totals:", error);
      return;
    }
    const totals: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0, other: 0 };
    for (const row of (data ?? []) as { amount: number; method: PaymentMethod }[]) {
      totals[row.method] = (totals[row.method] ?? 0) + Number(row.amount);
    }
    setPaymentTotals(totals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, contactId]);

  useEffect(() => {
    void fetchPaymentTotals();
  }, [fetchPaymentTotals]);

  function openCreate() {
    router.push(contactId ? `/billing/invoices/new?contact_id=${contactId}` : "/billing/invoices/new");
  }

  const openEdit = useCallback(
    async (invoiceId: string) => {
      setLoadingInvoiceId(invoiceId);
      try {
        const res = await fetch(`/api/billing/invoices/${invoiceId}`);
        const data = await res.json();
        setEditingInvoice(data.invoice as Invoice);
        setFormOpen(true);
      } catch (err) {
        console.error("Failed to load invoice:", err);
        toast.error(t("loadFailed"));
      } finally {
        setLoadingInvoiceId(null);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!autoOpenInvoiceId) return;
    void openEdit(autoOpenInvoiceId);
    onAutoOpenHandled?.();
  }, [autoOpenInvoiceId, openEdit, onAutoOpenHandled]);

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  const currencyFormatter = new Intl.NumberFormat(undefined, { style: "currency", currency: defaultCurrency });

  // "Cobranza vencida" — computed straight from the invoices already
  // fetched above, same no-separate-aggregate-endpoint approach
  // financial-summary.tsx uses for its own numbers. Deliberately NOT
  // scoped to a viewing period — "overdue" means overdue as of right
  // now, not "overdue within whatever month you happen to be looking
  // at."
  const overdueInvoices = useMemo(() => invoices.filter((inv) => inv.status === "overdue"), [invoices]);
  const overdueTotal = useMemo(
    () => overdueInvoices.reduce((sum, inv) => sum + (inv.total - inv.amount_paid), 0),
    [overdueInvoices],
  );
  const overdueAvgDays = useMemo(() => {
    if (overdueInvoices.length === 0) return 0;
    const now = Date.now();
    const totalDays = overdueInvoices.reduce((sum, inv) => {
      if (!inv.due_date) return sum;
      const days = Math.max(0, Math.floor((now - new Date(inv.due_date).getTime()) / 86_400_000));
      return sum + days;
    }, 0);
    return Math.round(totalDays / overdueInvoices.length);
  }, [overdueInvoices]);

  async function handleSendReminders() {
    setSendingReminders(true);
    try {
      const res = await fetch("/api/billing/invoices/send-overdue-reminders", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("overdueCard.sendFailed"));
        return;
      }
      if (data.total === 0) {
        toast.info(t("overdueCard.none"));
      } else if (data.failed > 0) {
        toast.warning(t("overdueCard.sendPartial", { sent: data.sent, failed: data.failed }));
      } else {
        toast.success(t("overdueCard.sendSuccess", { sent: data.sent }));
      }
      await fetchInvoices();
    } catch (err) {
      console.error("Send reminders error:", err);
      toast.error(t("overdueCard.sendFailed"));
    } finally {
      setSendingReminders(false);
    }
  }

  const showSidebar = !contactId;
  const hasPaymentTotals = paymentTotals && Object.values(paymentTotals).some((v) => v > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button type="button" size="sm" onClick={openCreate} className="bg-primary text-xs text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1 size-3.5" />
          {t("newInvoice")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Receipt className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className={showSidebar ? "grid grid-cols-1 gap-4 lg:grid-cols-[1fr_292px] lg:items-start" : undefined}>
          <div className="overflow-hidden rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.number")}</TableHead>
                  {!contactId && <TableHead>{t("columns.contact")}</TableHead>}
                  <TableHead>{t("columns.date")}</TableHead>
                  <TableHead>{t("columns.total")}</TableHead>
                  <TableHead>{t("columns.paid")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    onClick={() => openEdit(invoice.id)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium text-foreground">
                      {loadingInvoiceId === invoice.id ? <Loader2 className="size-3.5 animate-spin" /> : invoice.invoice_number}
                    </TableCell>
                    {!contactId && <TableCell>{invoice.contact?.name || invoice.contact?.phone}</TableCell>}
                    <TableCell>{dateFormatter.format(new Date(invoice.issue_date))}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency }).format(invoice.total)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency }).format(invoice.amount_paid)}
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[invoice.status]}`}>
                        {t(`statusValues.${invoice.status}`)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {showSidebar && (
            <div className="flex flex-col gap-3.5">
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold tracking-wide text-red-500 uppercase">{t("overdueCard.title")}</p>
                  <p className="mt-1.5 text-2xl font-bold text-red-600 tabular-nums dark:text-red-400">
                    {currencyFormatter.format(overdueTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("overdueCard.caption", { count: overdueInvoices.length, days: overdueAvgDays })}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSendReminders}
                    disabled={sendingReminders || overdueInvoices.length === 0}
                    className="mt-3 w-full bg-red-600 text-xs text-white hover:bg-red-700"
                  >
                    {sendingReminders ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    {t("overdueCard.sendReminders")}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 text-sm font-bold text-foreground">{t("paymentMethods.title")}</h3>
                  {hasPaymentTotals ? (
                    <div className="flex flex-col gap-2">
                      {PAYMENT_METHODS.filter((m) => (paymentTotals?.[m] ?? 0) > 0).map((m) => (
                        <div key={m} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t(`paymentMethods.${m}`)}</span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {currencyFormatter.format(paymentTotals?.[m] ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("paymentMethods.empty")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      <InvoiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        invoice={editingInvoice}
        contactId={contactId}
        onSaved={fetchInvoices}
      />
    </div>
  );
}
