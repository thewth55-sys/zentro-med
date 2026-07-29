"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BillingLineItemsEditor, type EditableLine } from "@/components/billing/billing-line-items-editor";
import type { Appointment, Contact, DiscountType, Product, Tax } from "@/types";

/**
 * Full-page invoice creation — the "Nueva factura" flow used to live
 * in a small Dialog (see invoice-form.tsx, still used for editing)
 * that cramped its fields on smaller screens. Creating is the heavier
 * of the two flows (contact search, full line-item editor, and now an
 * optional appointment link), so it gets a dedicated route with real
 * room to breathe. `?contact_id=` locks the patient and is how this
 * is reached from a patient's own Facturación tab; without it, this
 * behaves like the old dialog's contact-search flow.
 */
export default function NewInvoicePage() {
  const t = useTranslations("Billing.invoiceForm");
  const tNew = useTranslations("Billing.newInvoicePage");
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
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const backHref = lockedContactId ? `/contacts/${lockedContactId}?tab=billing` : "/billing?tab=invoices";

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

  useEffect(() => {
    if (!contact?.id) {
      setAppointments([]);
      setAppointmentId("");
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
          due_date: dueDate || null,
          notes: notes || null,
          items,
          discount_type: discountType,
          discount_value: discountValue,
        }),
      });
      if (!res.ok) throw new Error("create failed");
      toast.success(t("created"));
      router.push(backHref);
    } catch (err) {
      console.error("Create invoice error:", err);
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {tNew("back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{t("newTitle")}</h1>
      </div>

      <div className="space-y-5 rounded-xl border border-border bg-card p-5">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        />
      </div>

      <div className="flex justify-end gap-2">
        <Link href={backHref}>
          <Button type="button" variant="outline">
            {tNew("cancel")}
          </Button>
        </Link>
        <Button type="button" onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {saving ? <Loader2 className="size-4 animate-spin" /> : t("save")}
        </Button>
      </div>
    </div>
  );
}
