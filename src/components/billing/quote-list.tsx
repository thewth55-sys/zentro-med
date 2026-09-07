"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, FileText, Send } from "lucide-react";
import { useTranslations } from "next-intl";

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
import type { Quote, QuoteStatus } from "@/types";

const STATUS_STYLES: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
  expired: "bg-muted text-muted-foreground border-border",
  converted: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
};

const DAY_MS = 86_400_000;
const STALE_AFTER_DAYS = 7;

interface QuoteListProps {
  contactId?: string;
}

export function QuoteList({ contactId }: QuoteListProps) {
  const t = useTranslations("Billing.quoteList");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sendingFollowUps, setSendingFollowUps] = useState(false);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (contactId) params.set("contact_id", contactId);
      const res = await fetch(`/api/billing/quotes?${params.toString()}`);
      const data = await res.json();
      setQuotes((data.quotes ?? []) as Quote[]);
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [contactId, t]);

  useEffect(() => {
    void fetchQuotes();
  }, [fetchQuotes]);

  function openCreate() {
    router.push(contactId ? `/billing/quotes/new?contact_id=${contactId}` : "/billing/quotes/new");
  }

  function openQuote(quoteId: string) {
    router.push(`/billing/quotes/${quoteId}`);
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  // "Vigencia" — an at-a-glance expiry countdown derived from real
  // fields (status + expiry_date), distinct from the ESTADO column
  // which always shows the real quote status. A 'sent' quote whose
  // expiry has passed but that no cron has flipped to 'expired' yet
  // still reads as "Vencida" here instead of silently looking current.
  const vigencia = useCallback(
    (quote: Quote): { label: string; className: string } => {
      if (quote.status === "accepted") return { label: t("statusValues.accepted"), className: "text-emerald-500 font-semibold" };
      if (quote.status === "converted") return { label: t("statusValues.converted"), className: "text-indigo-400 font-semibold" };
      if (quote.status === "rejected") return { label: t("statusValues.rejected"), className: "text-muted-foreground" };
      if (quote.status === "expired") return { label: t("vigencia.expired"), className: "text-red-500 font-semibold" };
      if (!quote.expiry_date) return { label: t("vigencia.none"), className: "text-muted-foreground" };
      const daysLeft = Math.ceil((new Date(quote.expiry_date).getTime() - Date.now()) / DAY_MS);
      if (daysLeft < 0) return { label: t("vigencia.expired"), className: "text-red-500 font-semibold" };
      if (daysLeft <= 5) return { label: t("vigencia.dueSoon", { days: daysLeft }), className: "text-red-500 font-semibold" };
      return { label: t("vigencia.daysLeft", { days: daysLeft }), className: "text-foreground" };
    },
    [t],
  );

  // "Conversión" — de cotización enviada a tratamiento, scoped to this
  // calendar month (mirrors the mockup's "N de M este mes"). Drafts are
  // excluded — they were never actually sent to the patient.
  const conversion = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sentThisMonth = quotes.filter((q) => q.status !== "draft" && new Date(q.issue_date) >= startOfMonth);
    const accepted = sentThisMonth.filter((q) => q.status === "accepted" || q.status === "converted").length;
    const rejected = sentThisMonth.filter((q) => q.status === "rejected").length;
    const noResponse = sentThisMonth.filter((q) => q.status === "sent" || q.status === "expired").length;
    const total = sentThisMonth.length;
    return { accepted, rejected, noResponse, total, pct: total > 0 ? Math.round((accepted / total) * 100) : 0 };
  }, [quotes]);

  // "Sin respuesta hace +7 días" — deliberately NOT scoped to a period
  // (same reasoning as invoices' "Cobranza vencida"): a quote sent
  // three weeks ago is stale today, not just "in the month it was sent".
  const staleQuotes = useMemo(
    () => quotes.filter((q) => q.status === "sent" && Date.now() - new Date(q.issue_date).getTime() >= STALE_AFTER_DAYS * DAY_MS),
    [quotes],
  );
  const staleTotal = useMemo(() => staleQuotes.reduce((sum, q) => sum + q.total, 0), [staleQuotes]);
  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: staleQuotes[0]?.currency ?? quotes[0]?.currency ?? "USD",
  });

  async function handleFollowUp() {
    setSendingFollowUps(true);
    let sent = 0;
    let failed = 0;
    try {
      for (const quote of staleQuotes) {
        try {
          const pdfRes = await fetch(`/api/billing/quotes/${quote.id}/pdf`, { method: "POST" });
          const pdfBody = await pdfRes.json().catch(() => null);
          if (!pdfRes.ok || !pdfBody?.url) {
            failed++;
            continue;
          }
          const sendRes = await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contact_id: quote.contact_id,
              message_type: "document",
              media_url: pdfBody.url,
              filename: pdfBody.filename,
            }),
          });
          if (sendRes.ok) sent++;
          else failed++;
        } catch {
          failed++;
        }
      }
      if (sent === 0 && failed === 0) {
        toast.info(t("followUpCard.none"));
      } else if (failed > 0) {
        toast.warning(t("followUpCard.sendPartial", { sent, failed }));
      } else {
        toast.success(t("followUpCard.sendSuccess", { sent }));
      }
    } finally {
      setSendingFollowUps(false);
    }
  }

  const showSidebar = !contactId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button type="button" size="sm" onClick={openCreate} className="bg-primary text-xs text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1 size-3.5" />
          {t("newQuote")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText className="size-6 text-muted-foreground" />
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
                  <TableHead>{t("columns.vigencia")}</TableHead>
                  <TableHead>{t("columns.total")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => {
                  const v = vigencia(quote);
                  return (
                    <TableRow
                      key={quote.id}
                      onClick={() => openQuote(quote.id)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium text-foreground">{quote.quote_number}</TableCell>
                      {!contactId && <TableCell>{quote.contact?.name || quote.contact?.phone}</TableCell>}
                      <TableCell>{dateFormatter.format(new Date(quote.issue_date))}</TableCell>
                      <TableCell className={`text-xs ${v.className}`}>{v.label}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat(undefined, { style: "currency", currency: quote.currency }).format(quote.total)}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[quote.status]}`}>
                          {t(`statusValues.${quote.status}`)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {showSidebar && (
            <div className="flex flex-col gap-3.5">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-bold text-foreground">{t("conversionCard.title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("conversionCard.subtitle")}</p>
                  <div className="mt-3 mb-3.5 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
                      {conversion.pct}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("conversionCard.caption", { accepted: conversion.accepted, total: conversion.total })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {(
                      [
                        { key: "accepted", label: t("conversionCard.accepted"), count: conversion.accepted, color: "bg-emerald-500" },
                        { key: "noResponse", label: t("conversionCard.noResponse"), count: conversion.noResponse, color: "bg-amber-500" },
                        { key: "rejected", label: t("conversionCard.rejected"), count: conversion.rejected, color: "bg-red-500" },
                      ] as const
                    ).map((row) => (
                      <div key={row.key}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-semibold text-foreground tabular-nums">{row.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${row.color}`}
                            style={{ width: conversion.total > 0 ? `${(row.count / conversion.total) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4">
                  <p className="text-[11px] font-bold tracking-wide text-amber-600 uppercase dark:text-amber-400">
                    {t("followUpCard.title")}
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-amber-700 tabular-nums dark:text-amber-400">
                    {currencyFormatter.format(staleTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("followUpCard.caption", { count: staleQuotes.length })}</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleFollowUp}
                    disabled={sendingFollowUps || staleQuotes.length === 0}
                    className="mt-3 w-full bg-amber-600 text-xs text-white hover:bg-amber-700"
                  >
                    {sendingFollowUps ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    {t("followUpCard.sendFollowUp")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
