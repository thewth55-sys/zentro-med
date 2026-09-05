"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Landmark,
  Layers,
  Link2,
  Loader2,
  MessageCircle,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BillingLineItemsEditor, type EditableLine } from "@/components/billing/billing-line-items-editor";
import { PullFromPlanDialog } from "@/components/billing/pull-from-plan-dialog";
import { computeDocumentTotals } from "@/lib/billing/totals";
import type { Appointment, BankAccount, Contact, DiscountType, Invoice, Product, Tax } from "@/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type PaymentMethodIntent = "link" | "cash" | "transfer" | "terminal";

/**
 * Full-page invoice creation — dos columnas (datos + resumen) para
 * darle a "Nueva factura" el mismo espacio que ya tiene una cotización,
 * en vez de la tarjeta angosta de una sola columna que tenía antes.
 * `?contact_id=` sigue bloqueando el paciente igual que antes.
 */
export default function NewInvoicePage() {
  const t = useTranslations("Billing.invoiceForm");
  const tNew = useTranslations("Billing.newInvoicePage");
  const tLine = useTranslations("Billing.lineItems");
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedContactId = searchParams.get("contact_id");
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [currency, setCurrency] = useState("USD");

  const [contact, setContact] = useState<Contact | null>(null);
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const contactSearchSeq = useRef(0);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentId, setAppointmentId] = useState("");

  const [items, setItems] = useState<EditableLine[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [pullDialogOpen, setPullDialogOpen] = useState(false);

  const [sendWhatsappOnIssue, setSendWhatsappOnIssue] = useState(true);
  const [markPlanItemsDone, setMarkPlanItemsDone] = useState(true);
  const [paymentMethodIntent, setPaymentMethodIntent] = useState<PaymentMethodIntent | null>(null);
  const [primaryBankAccount, setPrimaryBankAccount] = useState<BankAccount | null>(null);
  const [gatewayActive, setGatewayActive] = useState(false);

  const [priorBalance, setPriorBalance] = useState<{ amount: number; invoiceId: string; invoiceNumber: string } | null>(
    null
  );
  const [mergedInvoiceNumber, setMergedInvoiceNumber] = useState<string | null>(null);

  const backHref = lockedContactId ? `/contacts/${lockedContactId}?tab=billing` : "/billing?tab=invoices";

  useEffect(() => {
    (async () => {
      const [p, tx, acct, bank, gateway] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("name"),
        supabase.from("taxes").select("*").eq("is_active", true).order("name"),
        supabase.from("accounts").select("default_currency").maybeSingle(),
        supabase.from("bank_accounts").select("*").eq("is_active", true).order("created_at").limit(1).maybeSingle(),
        supabase.from("payment_gateway_configs").select("is_active").eq("is_active", true).maybeSingle(),
      ]);
      setProducts((p.data ?? []) as Product[]);
      setTaxes((tx.data ?? []) as Tax[]);
      if (acct.data?.default_currency) setCurrency(acct.data.default_currency);
      setPrimaryBankAccount((bank.data as BankAccount | null) ?? null);
      setGatewayActive(!!gateway.data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!lockedContactId) return;
    (async () => {
      const { data } = await supabase.from("contacts").select("*").eq("id", lockedContactId).maybeSingle();
      if (data) setContact(data as Contact);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedContactId]);

  useEffect(() => {
    if (!contact?.id) {
      setAppointments([]);
      setAppointmentId("");
      setPriorBalance(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/appointments?contact_id=${contact.id}`);
        const data = await res.json();
        setAppointments((data.appointments ?? []) as Appointment[]);
      } catch (err) {
        console.error("Failed to load appointments for invoice:", err);
      }
    })();

    // Saldo pendiente en OTRA factura — mismo filtro (no draft/void) que
    // ya usa account-status-panel.tsx para "Facturado"/"Cobrado".
    (async () => {
      try {
        const res = await fetch(`/api/billing/invoices?contact_id=${contact.id}`);
        const data = await res.json();
        const billable = ((data.invoices ?? []) as Invoice[]).filter(
          (inv) => inv.status !== "draft" && inv.status !== "void"
        );
        const oldestPending = billable
          .filter((inv) => Number(inv.total) - Number(inv.amount_paid) > 0)
          .sort((a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime())[0];
        setPriorBalance(
          oldestPending
            ? {
                amount: Number(oldestPending.total) - Number(oldestPending.amount_paid),
                invoiceId: oldestPending.id,
                invoiceNumber: oldestPending.invoice_number,
              }
            : null
        );
      } catch (err) {
        console.error("Failed to load prior balance for invoice:", err);
      }
    })();
  }, [contact?.id]);

  const searchContacts = useCallback(
    async (query: string) => {
      const seq = ++contactSearchSeq.current;
      const like = `%${query.trim()}%`;
      const { data } = await supabase.from("contacts").select("*").or(`name.ilike.${like},phone.ilike.${like}`).limit(8);
      if (seq !== contactSearchSeq.current) return;
      setContactResults((data ?? []) as Contact[]);
    },
    [supabase]
  );

  useEffect(() => {
    if (!contactQuery.trim()) {
      setContactResults([]);
      return;
    }
    const handle = setTimeout(() => void searchContacts(contactQuery), 300);
    return () => clearTimeout(handle);
  }, [contactQuery, searchContacts]);

  const appointmentFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  const currencyFormatter = new Intl.NumberFormat(undefined, { style: "currency", currency });

  const taxRateById = new Map(taxes.map((tx) => [tx.id, tx.rate]));
  const totals = computeDocumentTotals(
    items.map((line) => ({
      quantity: line.quantity,
      unit_price: line.unit_price,
      tax_rate_snapshot: line.tax_id ? (taxRateById.get(line.tax_id) ?? 0) : 0,
      discount_type: line.discount_type,
      discount_value: line.discount_value,
    })),
    discountType,
    discountValue
  );

  async function sendCreatedInvoiceViaWhatsapp(invoiceId: string, contactId: string) {
    try {
      const pdfRes = await fetch(`/api/billing/invoices/${invoiceId}/pdf`, { method: "POST" });
      const pdfBody = await pdfRes.json().catch(() => null);
      if (!pdfRes.ok || !pdfBody?.url) {
        toast.error(t("whatsappSendFailed"));
        return;
      }
      const sendRes = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          message_type: "document",
          media_url: pdfBody.url,
          filename: pdfBody.filename,
        }),
      });
      if (!sendRes.ok) {
        toast.error(t("whatsappSendFailed"));
        return;
      }
      toast.success(t("whatsappSendSuccess"));
    } catch (err) {
      console.error("Send new invoice via WhatsApp error:", err);
      toast.error(t("whatsappSendFailed"));
    }
  }

  function handleMergeInvoice() {
    if (!priorBalance) return;
    setItems((prev) => [
      ...prev,
      {
        product_id: null,
        description: tNew("priorBalanceLineDescription", { invoiceNumber: priorBalance.invoiceNumber }),
        quantity: 1,
        unit_price: priorBalance.amount,
        tax_id: null,
        discount_type: null,
        discount_value: 0,
      },
    ]);
    setMergedInvoiceNumber(priorBalance.invoiceNumber);
  }

  async function sendCheckoutLink(invoiceId: string, contactId: string) {
    try {
      const linkRes = await fetch(`/api/billing/invoices/${invoiceId}/checkout-link`, { method: "POST" });
      const linkBody = await linkRes.json().catch(() => null);
      if (!linkRes.ok || !linkBody?.checkoutUrl) {
        toast.error(linkBody?.error ?? tNew("checkoutLinkFailed"));
        return;
      }
      const sendRes = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          message_type: "text",
          content_text: tNew("checkoutLinkMessage", { url: linkBody.checkoutUrl }),
        }),
      });
      if (!sendRes.ok) {
        toast.error(tNew("checkoutLinkFailed"));
        return;
      }
      toast.success(tNew("checkoutLinkSent"));
    } catch (err) {
      console.error("Generate/send checkout link error:", err);
      toast.error(tNew("checkoutLinkFailed"));
    }
  }

  async function handleSave() {
    if (!contact) {
      toast.error(t("contactRequired"));
      return;
    }
    if (items.length === 0) {
      toast.error(t("itemsRequired"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contact.id,
          appointment_id: appointmentId || null,
          issue_date: issueDate || null,
          due_date: dueDate || null,
          notes: notes || null,
          payment_method_intent: paymentMethodIntent,
          supersede_invoice_id: mergedInvoiceNumber ? priorBalance?.invoiceId : null,
          items: items.map((item) => ({
            ...item,
            source_quote_item_id: markPlanItemsDone ? item.source_quote_item_id : undefined,
          })),
          discount_type: discountType,
          discount_value: discountValue,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "create failed");
      toast.success(t("created"));

      if (sendWhatsappOnIssue) {
        await sendCreatedInvoiceViaWhatsapp(body.invoice.id, contact.id);
      }
      if (paymentMethodIntent === "link") {
        await sendCheckoutLink(body.invoice.id, contact.id);
      }

      router.push(backHref);
    } catch (err) {
      console.error("Create invoice error:", err);
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {tNew("back")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Columna principal */}
        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">{t("newTitle")}</h1>
              <Badge variant="secondary">{tNew("draftBadge")}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">{tNew("numberAssignedOnSave")}</span>
          </div>

          {!lockedContactId && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("contact")}</Label>
              {contact ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm">
                  <div>
                    <p className="text-foreground">{contact.name || contact.phone}</p>
                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                  </div>
                  <button type="button" onClick={() => setContact(null)} className="text-xs text-primary hover:text-primary/80">
                    {t("changeContact")}
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={contactQuery}
                    onChange={(e) => setContactQuery(e.target.value)}
                    placeholder={t("searchContactPlaceholder")}
                    className="h-10 border-border bg-muted pl-9 text-sm text-foreground"
                  />
                  {contactQuery.trim() && contactResults.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                      {contactResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setContact(c);
                            setContactQuery("");
                            setContactResults([]);
                          }}
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <span className="text-foreground">{c.name || c.phone}</span>
                          <span className="text-xs text-muted-foreground">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {priorBalance && !mergedInvoiceNumber && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-300">
                <AlertTriangle className="size-4 shrink-0" />
                {tNew("priorBalance", {
                  amount: currencyFormatter.format(priorBalance.amount),
                  invoiceNumber: priorBalance.invoiceNumber,
                })}
              </span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleMergeInvoice} className="text-xs font-medium text-primary hover:underline">
                  {tNew("mergeInvoices")}
                </button>
                <Link href={`/billing?tab=invoices&invoice=${priorBalance.invoiceId}`} className="text-xs text-muted-foreground hover:text-foreground">
                  {tNew("viewInvoice")}
                </Link>
              </div>
            </div>
          )}
          {mergedInvoiceNumber && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              {tNew("mergedConfirmation", { invoiceNumber: mergedInvoiceNumber })}
            </div>
          )}

          {contact && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="size-3.5" />
                {tNew("appointment")}
              </Label>
              <select
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">{tNew("noAppointment")}</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {appointmentFormatter.format(new Date(a.start_at))}
                    {a.service_type?.name ? ` — ${a.service_type.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tNew("issueDate")}</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-10 border-border bg-muted text-sm text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("dueDate")}</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 border-border bg-muted text-sm text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("notes")}</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10 border-border bg-muted text-sm text-foreground"
              />
            </div>
          </div>

          <BillingLineItemsEditor
            items={items}
            onChange={setItems}
            products={products}
            taxes={taxes}
            currency={currency}
            documentDiscountType={discountType}
            documentDiscountValue={discountValue}
            onDocumentDiscountChange={(type, value) => {
              setDiscountType(type);
              setDiscountValue(value);
            }}
            compactSummary
          />

          {contact && (
            <Button type="button" variant="outline" size="sm" onClick={() => setPullDialogOpen(true)}>
              <Layers className="size-3.5" />
              {tNew("pullFromPlan")}
            </Button>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{tNew("howToPay")}</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentMethodIntent("link")}
                disabled={!gatewayActive}
                className={`flex items-start gap-2 rounded-lg border p-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                  paymentMethodIntent === "link" ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                }`}
              >
                <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium text-foreground">{tNew("payLink")}</span>
                  <span className="block text-xs text-muted-foreground">
                    {gatewayActive ? tNew("payLinkHint") : tNew("payLinkUnavailable")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodIntent("cash")}
                className={`flex items-start gap-2 rounded-lg border p-3 text-left text-sm ${
                  paymentMethodIntent === "cash" ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                }`}
              >
                <Banknote className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium text-foreground">{tNew("payCash")}</span>
                  <span className="block text-xs text-muted-foreground">{tNew("payCashHint")}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodIntent("transfer")}
                className={`flex items-start gap-2 rounded-lg border p-3 text-left text-sm ${
                  paymentMethodIntent === "transfer" ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                }`}
              >
                <Landmark className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium text-foreground">{tNew("payTransfer")}</span>
                  <span className="block text-xs text-muted-foreground">
                    {primaryBankAccount
                      ? `${primaryBankAccount.bank_name ?? primaryBankAccount.name}${
                          primaryBankAccount.account_number_last4 ? ` · •••• ${primaryBankAccount.account_number_last4}` : ""
                        }`
                      : tNew("payTransferHint")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodIntent("terminal")}
                className={`flex items-start gap-2 rounded-lg border p-3 text-left text-sm ${
                  paymentMethodIntent === "terminal" ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                }`}
              >
                <CreditCard className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium text-foreground">{tNew("payTerminal")}</span>
                  <span className="block text-xs text-muted-foreground">{tNew("payTerminalHint")}</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Resumen + al emitir */}
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">{tNew("summary")}</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{tLine("subtotal")}</span>
                <span>{currencyFormatter.format(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>{tNew("patientDiscount")}</span>
                  <span>−{currencyFormatter.format(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
                <span>{tNew("total")}</span>
                <span>{currencyFormatter.format(totals.total)}</span>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
              {saving ? t("saving") : tNew("issueAndSend")}
            </Button>
            <Link href={backHref} className="block text-center text-xs text-muted-foreground hover:text-foreground">
              {tNew("cancel")}
            </Link>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">{tNew("onIssue")}</h2>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={sendWhatsappOnIssue}
                onChange={(e) => setSendWhatsappOnIssue(e.target.checked)}
                className="mt-0.5 size-3.5 accent-primary"
              />
              {tNew("sendWhatsapp")}
            </label>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={markPlanItemsDone}
                onChange={(e) => setMarkPlanItemsDone(e.target.checked)}
                className="mt-0.5 size-3.5 accent-primary"
              />
              {tNew("markPlanItemsDone")}
            </label>
            {paymentMethodIntent === "link" && (
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked disabled className="mt-0.5 size-3.5 accent-primary" />
                {tNew("generateLink")}
              </label>
            )}
          </div>
        </div>
      </div>

      {contact && (
        <PullFromPlanDialog
          open={pullDialogOpen}
          onOpenChange={setPullDialogOpen}
          contactId={contact.id}
          currency={currency}
          onAdd={(lines) => setItems((prev) => [...prev, ...lines])}
        />
      )}
    </div>
  );
}
