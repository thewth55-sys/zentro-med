"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuoteForm } from "./quote-form";
import type { Quote, QuoteStatus } from "@/types";

const STATUS_STYLES: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
  expired: "bg-muted text-muted-foreground border-border",
  converted: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
};

interface HistoryEntry {
  key: string;
  at: string;
  title: string;
  meta?: string;
  href?: string;
  dot: string;
}

interface QuoteDetailProps {
  quoteId: string;
}

export function QuoteDetail({ quoteId }: QuoteDetailProps) {
  const t = useTranslations("Billing.quoteDetail");
  const tForm = useTranslations("Billing.quoteForm");
  const router = useRouter();
  const { account } = useAuth();

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [converting, setConverting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/quotes/${quoteId}`);
      if (!res.ok) {
        setQuote(null);
        return;
      }
      const data = await res.json();
      setQuote(data.quote as Quote);
    } catch (err) {
      console.error("Failed to fetch quote:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [quoteId, t]);

  useEffect(() => {
    void fetchQuote();
  }, [fetchQuote]);

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });
  const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  const history = useMemo<HistoryEntry[]>(() => {
    if (!quote) return [];
    const entries: HistoryEntry[] = [
      { key: "created", at: quote.created_at, title: t("history.created"), dot: "bg-muted-foreground" },
    ];
    if (quote.approved_at) {
      entries.push({ key: "approved", at: quote.approved_at, title: t("history.accepted"), dot: "bg-emerald-500" });
    }
    if (quote.convertedInvoice) {
      entries.push({
        key: "converted",
        at: quote.convertedInvoice.created_at,
        title: t("history.converted", { invoiceNumber: quote.convertedInvoice.invoice_number }),
        href: `/billing/invoices/${quote.convertedInvoice.id}`,
        dot: "bg-indigo-500",
      });
    }
    return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [quote, t]);

  // Items grouped by treatment-plan phase, same grouping the plan editor
  // itself uses — only rendered when the quote actually has phases;
  // otherwise a flat list, same as the invoice detail view.
  const groupedItems = useMemo(() => {
    if (!quote) return [];
    const items = quote.items ?? [];
    if (!quote.phases || quote.phases.length === 0) {
      return [{ phase: null, items }];
    }
    const byPhase = new Map<string | null, typeof items>();
    for (const item of items) {
      const key = item.phase_id ?? null;
      byPhase.set(key, [...(byPhase.get(key) ?? []), item]);
    }
    const groups: { phase: (typeof quote.phases)[number] | null; items: typeof items }[] = quote.phases
      .map((phase) => ({ phase, items: byPhase.get(phase.id) ?? [] }))
      .filter((g) => g.items.length > 0);
    const unassigned = byPhase.get(null) ?? [];
    if (unassigned.length > 0) groups.push({ phase: null, items: unassigned });
    return groups;
  }, [quote]);

  async function generateQuotePdf(): Promise<{ url: string; filename: string } | null> {
    if (!quote) return null;
    const res = await fetch(`/api/billing/quotes/${quote.id}/pdf`, { method: "POST" });
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
      const result = await generateQuotePdf();
      if (result) window.open(result.url, "_blank");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleSendWhatsapp() {
    if (!quote?.contact_id) return;
    setSendingWhatsapp(true);
    try {
      const result = await generateQuotePdf();
      if (!result) return;
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: quote.contact_id,
          message_type: "document",
          media_url: result.url,
          filename: result.filename,
        }),
      });
      if (!res.ok) {
        toast.error(tForm("whatsappSendFailed"));
        return;
      }
      toast.success(tForm("whatsappSendSuccess"));
    } finally {
      setSendingWhatsapp(false);
    }
  }

  async function handleSendEmail() {
    if (!quote?.id) return;
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/billing/quotes/${quote.id}/send-email`, { method: "POST" });
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

  async function handleConvert() {
    if (!quote) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/billing/quotes/${quote.id}/convert`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "convert failed");
      }
      toast.success(tForm("converted"));
      await fetchQuote();
    } catch (err) {
      console.error("Convert quote error:", err);
      toast.error(tForm("convertFailed"));
    } finally {
      setConverting(false);
    }
  }

  async function handleDuplicate() {
    if (!quote) return;
    setDuplicating(true);
    try {
      const res = await fetch("/api/billing/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: quote.contact_id,
          notes: quote.notes,
          items: (quote.items ?? []).map((i) => ({
            product_id: i.product_id,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            tax_id: i.tax_id,
            discount_type: i.discount_type,
            discount_value: i.discount_value,
          })),
          discount_type: quote.discount_type,
          discount_value: quote.discount_value,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.quote?.id) throw new Error(body?.error ?? "duplicate failed");
      toast.success(t("actions.duplicateSuccess"));
      router.push(`/billing/quotes/${body.quote.id}`);
    } catch (err) {
      console.error("Duplicate quote error:", err);
      toast.error(t("actions.duplicateFailed"));
    } finally {
      setDuplicating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <FileText className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => router.push("/billing?tab=quotes")}>
          {t("back")}
        </Button>
      </div>
    );
  }

  const currencyFmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: quote.currency }).format(n);

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
                  <FileText className="size-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-base font-bold text-foreground">{account?.name}</p>
                  {account?.address && <p className="text-sm text-muted-foreground">{account.address}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground">{t("quoteLabel")}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{quote.quote_number}</p>
                <span
                  className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLES[quote.status]}`}
                >
                  {tForm(`statusValues.${quote.status}`)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 border-b border-border py-6 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground">{t("billTo")}</p>
                <p className="mt-1.5 text-sm font-semibold text-foreground">{quote.contact?.name || quote.contact?.phone}</p>
                {quote.contact?.phone && <p className="text-xs text-muted-foreground">{quote.contact.phone}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground">{t("issued")}</p>
                <p className="mt-1.5 text-sm font-semibold text-foreground">{dateFormatter.format(new Date(quote.issue_date))}</p>
                {quote.expiry_date && (
                  <>
                    <p className="mt-2.5 text-[11px] font-bold tracking-wider text-muted-foreground">{t("expiry")}</p>
                    <p className="mt-1.5 text-sm font-semibold text-foreground">{dateFormatter.format(new Date(quote.expiry_date))}</p>
                  </>
                )}
              </div>
            </div>

            <div className="py-6">
              {groupedItems.map((group, gi) => (
                <div key={group.phase?.id ?? `unassigned-${gi}`} className={gi > 0 ? "mt-5" : undefined}>
                  {group.phase && (
                    <p className="mb-2 text-xs font-bold text-foreground">{group.phase.name}</p>
                  )}
                  <div className="grid grid-cols-[2.4fr_0.6fr_1fr_1fr] gap-3 border-b border-border pb-2.5 text-[10.5px] font-bold tracking-wider text-muted-foreground">
                    <span>{t("columns.concept")}</span>
                    <span className="text-center">{t("columns.qty")}</span>
                    <span className="text-right">{t("columns.unitPrice")}</span>
                    <span className="text-right">{t("columns.amount")}</span>
                  </div>
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[2.4fr_0.6fr_1fr_1fr] items-center gap-3 border-b border-border/60 py-3.5"
                    >
                      <span className="text-sm font-semibold text-foreground">{item.description}</span>
                      <span className="text-center text-sm tabular-nums text-muted-foreground">{item.quantity}</span>
                      <span className="text-right text-sm tabular-nums text-foreground">{currencyFmt(item.unit_price)}</span>
                      <span className="text-right text-sm font-bold tabular-nums text-foreground">{currencyFmt(item.line_total)}</span>
                    </div>
                  ))}
                </div>
              ))}

              <div className="flex justify-end pt-5">
                <div className="flex w-full max-w-[300px] flex-col gap-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("subtotal")}</span>
                    <span className="font-semibold tabular-nums text-foreground">{currencyFmt(quote.subtotal)}</span>
                  </div>
                  {quote.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("discount")}</span>
                      <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                        −{currencyFmt(quote.discount_amount)}
                      </span>
                    </div>
                  )}
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-foreground">{t("total")}</span>
                    <span className="font-bold tabular-nums text-foreground">{currencyFmt(quote.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {quote.notes && (
              <div className="border-t border-border pt-5">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground">{t("notes")}</p>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{quote.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3.5">
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
                        {entry.href ? (
                          <Link href={entry.href} className="block text-sm font-semibold text-primary hover:underline">
                            {entry.title}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                        )}
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendWhatsapp}
                disabled={sendingWhatsapp}
                className="text-xs"
              >
                {sendingWhatsapp ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
                {tForm("sendWhatsapp")}
              </Button>
              {quote.contact?.email && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="text-xs"
                >
                  {sendingEmail ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                  {tForm("sendEmail")}
                </Button>
              )}
              {quote.status === "accepted" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleConvert}
                  disabled={converting}
                  className="border-primary/40 text-xs text-primary hover:bg-primary/10"
                >
                  {converting ? <Loader2 className="size-3.5 animate-spin" /> : <FileCheck2 className="size-3.5" />}
                  {tForm("convertToInvoice")}
                </Button>
              )}
              {quote.status !== "converted" && (
                <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)} className="text-xs">
                  {t("actions.edit")}
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating} className="text-xs">
                {duplicating ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
                {t("actions.duplicate")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <QuoteForm open={editOpen} onOpenChange={setEditOpen} quote={quote} onSaved={fetchQuote} />
    </div>
  );
}
