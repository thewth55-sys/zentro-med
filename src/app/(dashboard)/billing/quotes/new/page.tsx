"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MessageCircle, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BillingLineItemsEditor, type EditableLine, type EditablePhase } from "@/components/billing/billing-line-items-editor";
import { computeDocumentTotals } from "@/lib/billing/totals";
import type { Contact, DiscountType, Product, Tax } from "@/types";

/**
 * Full-page quote creation — mirrors /billing/invoices/new's layout
 * (contact + line items on the left, summary + on-issue actions on the
 * right) instead of the cramped single-column QuoteForm dialog, which
 * stays around for editing an existing quote.
 */
export default function NewQuotePage() {
  const t = useTranslations("Billing.quoteForm");
  const tNew = useTranslations("Billing.newQuotePage");
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

  const [items, setItems] = useState<EditableLine[]>([]);
  const [phases, setPhases] = useState<EditablePhase[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendWhatsappOnIssue, setSendWhatsappOnIssue] = useState(true);

  const backHref = lockedContactId ? `/contacts/${lockedContactId}?tab=billing` : "/billing?tab=quotes";

  useEffect(() => {
    (async () => {
      const [p, tx, acct] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("name"),
        supabase.from("taxes").select("*").eq("is_active", true).order("name"),
        supabase.from("accounts").select("default_currency").maybeSingle(),
      ]);
      setProducts((p.data ?? []) as Product[]);
      setTaxes((tx.data ?? []) as Tax[]);
      if (acct.data?.default_currency) setCurrency(acct.data.default_currency);
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

  const searchContacts = useCallback(
    async (query: string) => {
      const seq = ++contactSearchSeq.current;
      const like = `%${query.trim()}%`;
      const { data } = await supabase.from("contacts").select("*").or(`name.ilike.${like},phone.ilike.${like}`).limit(8);
      if (seq !== contactSearchSeq.current) return;
      setContactResults((data ?? []) as Contact[]);
    },
    [supabase],
  );

  useEffect(() => {
    if (!contactQuery.trim()) {
      setContactResults([]);
      return;
    }
    const handle = setTimeout(() => void searchContacts(contactQuery), 300);
    return () => clearTimeout(handle);
  }, [contactQuery, searchContacts]);

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
    discountValue,
  );

  async function sendCreatedQuoteViaWhatsapp(quoteId: string, contactId: string) {
    try {
      const pdfRes = await fetch(`/api/billing/quotes/${quoteId}/pdf`, { method: "POST" });
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
      console.error("Send new quote via WhatsApp error:", err);
      toast.error(t("whatsappSendFailed"));
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
      const res = await fetch("/api/billing/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contact.id,
          expiry_date: expiryDate || null,
          notes: notes || null,
          items,
          phases,
          discount_type: discountType,
          discount_value: discountValue,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "create failed");
      toast.success(t("created"));

      if (sendWhatsappOnIssue) {
        await sendCreatedQuoteViaWhatsapp(body.quote.id, contact.id);
      }

      router.push(`/billing/quotes/${body.quote.id}`);
    } catch (err) {
      console.error("Create quote error:", err);
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {tNew("back")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("expiryDate")}</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
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
            phases={phases}
            onPhasesChange={setPhases}
            compactSummary
          />
        </div>

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
                  <span>{tLine("documentDiscount")}</span>
                  <span>−{currencyFormatter.format(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
                <span>{tNew("total")}</span>
                <span>{currencyFormatter.format(totals.total)}</span>
              </div>
            </div>
            <Button type="button" onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
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
          </div>
        </div>
      </div>
    </div>
  );
}
