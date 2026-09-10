"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Download,
  Link2,
  Loader2,
  Mail,
  Plus,
  Receipt,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceForm } from "./invoice-form";
import { PaymentForm } from "./payment-form";
import type { Invoice, InvoiceStatus } from "@/types";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  partial: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  overdue: "bg-red-500/10 text-red-400 border-red-500/30",
  void: "bg-muted text-muted-foreground border-border",
};

interface HistoryEntry {
  key: string;
  at: string;
  title: string;
  meta?: string;
  dot: string;
}

interface InvoiceDetailProps {
  invoiceId: string;
  /** Set when the "Registrar pago" shortcut elsewhere (AccountStatusPanel)
   *  sent us here specifically to collect a payment — auto-opens the
   *  manual-payment dialog once the invoice has loaded. */
  autoOpenPayment?: boolean;
}

export function InvoiceDetail({ invoiceId, autoOpenPayment }: InvoiceDetailProps) {
  const t = useTranslations("Billing.invoiceDetail");
  const tForm = useTranslations("Billing.invoiceForm");
  const tNew = useTranslations("Billing.newInvoicePage");
  const tPay = useTranslations("Billing.payments");
  const router = useRouter();
  const { account } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [gatewayActive, setGatewayActive] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/invoices/${invoiceId}`);
      if (!res.ok) {
        setInvoice(null);
        return;
      }
      const data = await res.json();
      setInvoice(data.invoice as Invoice);
    } catch (err) {
      console.error("Failed to fetch invoice:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [invoiceId, t]);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  useEffect(() => {
    supabase
      .from("payment_gateway_configs")
      .select("is_active")
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => setGatewayActive(!!data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoOpenPayment && invoice) setPaymentDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenPayment, invoice?.id]);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { style: "currency", currency: invoice?.currency ?? "USD" }),
    [invoice?.currency],
  );
  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });
  const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  const outstanding = invoice ? Number(invoice.total) - Number(invoice.amount_paid) : 0;
  const canCollect = !!invoice && invoice.status !== "paid" && invoice.status !== "void" && outstanding > 0;

  const history = useMemo<HistoryEntry[]>(() => {
    if (!invoice) return [];
    const entries: HistoryEntry[] = [
      { key: "created", at: invoice.created_at, title: t("history.created"), dot: "bg-muted-foreground" },
    ];
    for (const payment of invoice.payments ?? []) {
      entries.push({
        key: `payment-${payment.id}`,
        at: payment.paid_at,
        title: t("history.paymentReceived", { amount: currencyFormatter.format(Number(payment.amount)) }),
        meta: tPay(`methods.${payment.method}`),
        dot: "bg-emerald-500",
      });
    }
    for (const checkout of invoice.checkouts ?? []) {
      entries.push({
        key: `checkout-${checkout.id}`,
        at: checkout.created_at,
        title: t("history.checkoutGenerated"),
        meta: checkout.provider,
        dot: "bg-primary",
      });
    }
    for (const reminder of invoice.reminders ?? []) {
      if (!reminder.sent_at) continue;
      entries.push({
        key: `reminder-${reminder.id}`,
        at: reminder.sent_at,
        title: t("history.reminderSent"),
        dot: "bg-amber-500",
      });
    }
    return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [invoice, t, tPay, currencyFormatter]);

  async function generateInvoicePdf(): Promise<{ url: string; filename: string } | null> {
    if (!invoice) return null;
    const res = await fetch(`/api/billing/invoices/${invoice.id}/pdf`, { method: "POST" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.url) {
      toast.error(body?.error ?? tForm("pdfFailed"));
      return null;
    }
    return { url: body.url, filename: body.filename };
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const result = await generateInvoicePdf();
      if (result) window.open(result.url, "_blank");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleSendEmail() {
    if (!invoice) return;
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/billing/invoices/${invoice.id}/send-email`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? tForm("emailSendFailed"));
        return;
      }
      toast.success(tForm("emailSendSuccess"));
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleGenerateLink() {
    if (!invoice) return;
    setGeneratingLink(true);
    try {
      const linkRes = await fetch(`/api/billing/invoices/${invoice.id}/checkout-link`, { method: "POST" });
      const linkBody = await linkRes.json().catch(() => null);
      if (!linkRes.ok || !linkBody?.checkoutUrl) {
        toast.error(linkBody?.error ?? tNew("checkoutLinkFailed"));
        return;
      }
      const sendRes = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: invoice.contact_id,
          message_type: "text",
          content_text: tNew("checkoutLinkMessage", { url: linkBody.checkoutUrl }),
        }),
      });
      if (!sendRes.ok) {
        toast.error(tNew("checkoutLinkFailed"));
        return;
      }
      toast.success(tNew("checkoutLinkSent"));
      await fetchInvoice();
    } catch (err) {
      console.error("Generate checkout link error:", err);
      toast.error(tNew("checkoutLinkFailed"));
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleDuplicate() {
    if (!invoice) return;
    setDuplicating(true);
    try {
      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: invoice.contact_id,
          deal_id: invoice.deal_id,
          notes: invoice.notes,
          items: (invoice.items ?? []).map((i) => ({
            product_id: i.product_id,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            tax_id: i.tax_id,
            discount_type: i.discount_type,
            discount_value: i.discount_value,
          })),
          discount_type: invoice.discount_type,
          discount_value: invoice.discount_value,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.invoice?.id) throw new Error(body?.error ?? "duplicate failed");
      toast.success(t("actions.duplicateSuccess"));
      router.push(`/billing/invoices/${body.invoice.id}`);
    } catch (err) {
      console.error("Duplicate invoice error:", err);
      toast.error(t("actions.duplicateFailed"));
    } finally {
      setDuplicating(false);
    }
  }

  async function handleCancel() {
    if (!invoice) return;
    if (!window.confirm(t("actions.cancelConfirm"))) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/billing/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "void" }),
      });
      if (!res.ok) throw new Error("cancel failed");
      toast.success(t("actions.cancelSuccess"));
      await fetchInvoice();
    } catch (err) {
      console.error("Cancel invoice error:", err);
      toast.error(t("actions.cancelFailed"));
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Receipt className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => router.push("/billing?tab=invoices")}>
          {t("back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("back")}
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Receipt className="size-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-base font-bold text-foreground">{account?.name}</p>
                  {account?.address && <p className="text-sm text-muted-foreground">{account.address}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground">{t("invoiceLabel")}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{invoice.invoice_number}</p>
                <span
                  className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLES[invoice.status]}`}
                >
                  {tForm(`statusValues.${invoice.status}`)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 border-b border-border py-6 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground">{t("billTo")}</p>
                <p className="mt-1.5 text-sm font-semibold text-foreground">
                  {invoice.contact?.name || invoice.contact?.phone}
                </p>
                {invoice.contact?.phone && <p className="text-xs text-muted-foreground">{invoice.contact.phone}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground">{t("issued")}</p>
                <p className="mt-1.5 text-sm font-semibold text-foreground">
                  {dateFormatter.format(new Date(invoice.issue_date))}
                </p>
                {invoice.due_date && (
                  <>
                    <p className="mt-2.5 text-[11px] font-bold tracking-wider text-muted-foreground">{t("due")}</p>
                    <p className="mt-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                      {dateFormatter.format(new Date(invoice.due_date))}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="py-6">
              <div className="grid grid-cols-[2.4fr_0.6fr_1fr_1fr] gap-3 border-b border-border pb-2.5 text-[10.5px] font-bold tracking-wider text-muted-foreground">
                <span>{t("columns.concept")}</span>
                <span className="text-center">{t("columns.qty")}</span>
                <span className="text-right">{t("columns.unitPrice")}</span>
                <span className="text-right">{t("columns.amount")}</span>
              </div>
              {(invoice.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2.4fr_0.6fr_1fr_1fr] items-center gap-3 border-b border-border/60 py-3.5"
                >
                  <span className="text-sm font-semibold text-foreground">{item.description}</span>
                  <span className="text-center text-sm tabular-nums text-muted-foreground">{item.quantity}</span>
                  <span className="text-right text-sm tabular-nums text-foreground">
                    {new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency }).format(item.unit_price)}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums text-foreground">
                    {new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency }).format(item.line_total)}
                  </span>
                </div>
              ))}

              <div className="flex justify-end pt-5">
                <div className="flex w-full max-w-[300px] flex-col gap-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("subtotal")}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency }).format(invoice.subtotal)}
                    </span>
                  </div>
                  {invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("discount")}</span>
                      <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                        −{new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency }).format(invoice.discount_amount)}
                      </span>
                    </div>
                  )}
                  {invoice.amount_paid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("paid")}</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency }).format(invoice.amount_paid)}
                      </span>
                    </div>
                  )}
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-foreground">{outstanding > 0 ? t("balanceDue") : t("total")}</span>
                    <span className={`font-bold tabular-nums ${outstanding > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: invoice.currency }).format(
                        outstanding > 0 ? outstanding : invoice.total,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="border-t border-border pt-5">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground">{t("notes")}</p>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3.5">
          {canCollect && (
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-bold text-foreground">{t("collect.title")}</h3>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateLink}
                  disabled={generatingLink || !gatewayActive}
                  className="w-full bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                >
                  {generatingLink ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
                  {t("collect.generateLink")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(true)}
                  className="mt-2 w-full text-xs"
                >
                  <Plus className="size-3.5" />
                  {t("collect.manualPayment")}
                </Button>
                <p className="mt-3 rounded-lg border border-border bg-muted/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  {gatewayActive ? t("collect.linkHint") : t("collect.gatewayInactive")}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-bold text-foreground">{t("history.title")}</h3>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("history.empty")}</p>
              ) : (
                <div className="flex flex-col">
                  {history.map((entry, i) => (
                    <div key={entry.key} className="grid grid-cols-[14px_1fr] gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`mt-1 size-2 rounded-full ${entry.dot}`} />
                        {i < history.length - 1 && <span className="w-px flex-1 bg-border" />}
                      </div>
                      <div className={i < history.length - 1 ? "pb-4" : ""}>
                        <p className="text-[11px] font-semibold text-muted-foreground">{dateTimeFormatter.format(new Date(entry.at))}</p>
                        <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                        {entry.meta && <p className="text-xs text-muted-foreground">{entry.meta}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 p-4">
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloadingPdf} className="text-xs">
                {downloadingPdf ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                {tForm("downloadPdf")}
              </Button>
              {invoice.contact?.email && (
                <Button type="button" variant="outline" size="sm" onClick={handleSendEmail} disabled={sendingEmail} className="text-xs">
                  {sendingEmail ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                  {tForm("sendEmail")}
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)} className="text-xs">
                {t("actions.edit")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating} className="text-xs">
                {duplicating ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
                {t("actions.duplicate")}
              </Button>
              {invoice.status !== "void" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
                >
                  {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                  {t("actions.cancel")}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">{t("collect.manualPayment")}</DialogTitle>
          </DialogHeader>
          <PaymentForm
            invoiceId={invoice.id}
            remaining={outstanding}
            currency={invoice.currency}
            onSaved={() => {
              setPaymentDialogOpen(false);
              void fetchInvoice();
            }}
          />
        </DialogContent>
      </Dialog>

      <InvoiceForm open={editOpen} onOpenChange={setEditOpen} invoice={invoice} onSaved={fetchInvoice} />
    </div>
  );
}
