"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ExternalLink, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ZOHO_DESK_HELP_CENTER_URL = "https://zentrolatam.zohodesk.com/portal/es/home";

interface HelpTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  createdTime: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  Open: "default",
  "On Hold": "secondary",
  Closed: "outline",
  Escalated: "default",
};

export function HelpCenter() {
  const t = useTranslations("Help");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  function statusLabel(status: string): string {
    return t.has(`status.${status}`) ? t(`status.${status}`) : status;
  }

  async function fetchTickets() {
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/help/tickets", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? t("tickets.loadError"));
        return;
      }
      setTickets(body?.tickets ?? []);
    } catch {
      toast.error(t("tickets.loadError"));
    } finally {
      setLoadingTickets(false);
    }
  }

  useEffect(() => {
    void fetchTickets();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error(t("form.required"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/help/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? t("form.error"));
        return;
      }
      toast.success(t("form.success", { number: body.ticket.ticketNumber }));
      setSubject("");
      setDescription("");
      void fetchTickets();
    } catch {
      toast.error(t("form.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <a href={ZOHO_DESK_HELP_CENTER_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" type="button">
            {t("kbButton")}
            <ExternalLink className="ml-1.5 size-3.5" />
          </Button>
        </a>
      </div>

      <Tabs defaultValue="ask">
        <TabsList>
          <TabsTrigger value="ask">{t("tabs.ask")}</TabsTrigger>
          <TabsTrigger value="tickets">{t("tabs.myTickets")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ask">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">{t("form.subject")}</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t("form.subjectPlaceholder")}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">{t("form.description")}</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("form.descriptionPlaceholder")}
                    rows={5}
                    maxLength={4000}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {t("form.submit")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardContent className="pt-6">
              {loadingTickets ? (
                <div className="flex justify-center py-8 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("tickets.empty")}</p>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("tickets.number", { number: ticket.ticketNumber })} ·{" "}
                          {dateFormatter.format(new Date(ticket.createdTime))}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANT[ticket.status] ?? "outline"}>
                        {statusLabel(ticket.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
