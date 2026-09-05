"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ListChecks, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TemplatePicker, type TemplateSendValues } from "@/components/inbox/template-picker";
import { WaitlistDialog } from "./waitlist-dialog";
import { computeWeekOccupancy, findLargestFreeBlock } from "@/lib/agenda/occupancy";
import type { Appointment, Doctor, DoctorAvailabilityBlock, MessageTemplate, ServiceType } from "@/types";

interface AgendaSidebarProps {
  doctors: Doctor[];
  serviceTypes: ServiceType[];
  /** Same data agenda-calendar-view.tsx already fetches for the
   *  visible range — passed down instead of re-fetched, so occupancy
   *  and the free-block suggestion always match whatever week/day is
   *  currently on screen. */
  availabilityBlocks: DoctorAvailabilityBlock[];
  rangeAppointments: Appointment[];
  range: { from: string; to: string } | null;
}

interface ActionAppointment extends Appointment {
  hasAcceptedQuote?: boolean;
}

/**
 * Right-column panel for /agenda: "Ocupación de la semana" (real,
 * derived from doctor_availability_blocks — see lib/agenda/occupancy)
 * and "Requieren acción" (unconfirmed appointments today, recent
 * no-shows, and a detected free block to offer the waitlist). Its own
 * independent fetch for the action items — those are always "today",
 * regardless of which week the calendar itself is showing.
 */
export function AgendaSidebar({ doctors, serviceTypes, availabilityBlocks, rangeAppointments, range }: AgendaSidebarProps) {
  const t = useTranslations("Agenda.sidebar");
  const supabase = createClient();

  const [unconfirmed, setUnconfirmed] = useState<ActionAppointment | null>(null);
  const [noShow, setNoShow] = useState<ActionAppointment | null>(null);
  const [loadingActions, setLoadingActions] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [templateFor, setTemplateFor] = useState<ActionAppointment | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistDoctorId, setWaitlistDoctorId] = useState<string | null>(null);

  const fetchActionItems = useCallback(async () => {
    setLoadingActions(true);
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      const res = await fetch(
        `/api/appointments?from=${yesterdayStart.toISOString()}&to=${todayEnd.toISOString()}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const appts = (data.appointments ?? []) as Appointment[];

      const nextUnconfirmed =
        appts.find(
          (a) =>
            a.status === "pending" &&
            new Date(a.start_at) >= todayStart &&
            new Date(a.start_at) < todayEnd &&
            new Date(a.start_at) >= now,
        ) ?? null;

      const nextNoShow =
        appts.find(
          (a) => a.status === "no_show" && new Date(a.start_at) >= yesterdayStart && new Date(a.start_at) < todayStart,
        ) ?? null;

      setUnconfirmed(nextUnconfirmed);

      if (nextNoShow?.contact_id) {
        const { data: quotes } = await supabase
          .from("quotes")
          .select("id")
          .eq("contact_id", nextNoShow.contact_id)
          .eq("status", "accepted")
          .limit(1);
        setNoShow({ ...nextNoShow, hasAcceptedQuote: (quotes?.length ?? 0) > 0 });
      } else {
        setNoShow(null);
      }
    } catch (err) {
      console.error("[agenda-sidebar] failed to load action items:", err);
    } finally {
      setLoadingActions(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchActionItems();
  }, [fetchActionItems]);

  const occupancy = useMemo(() => {
    if (!range) return null;
    return computeWeekOccupancy(doctors, availabilityBlocks, rangeAppointments, new Date(range.from), new Date(range.to));
  }, [doctors, availabilityBlocks, rangeAppointments, range]);

  const freeBlock = useMemo(
    () => findLargestFreeBlock(doctors, availabilityBlocks, rangeAppointments, new Date()),
    [doctors, availabilityBlocks, rangeAppointments],
  );

  function sendConfirmationRequest(appt: ActionAppointment) {
    setTemplateFor(appt);
  }

  async function handleTemplateSelected(template: MessageTemplate, values: TemplateSendValues) {
    const appt = templateFor;
    if (!appt?.contact_id) return;
    setSendingId(appt.id);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: appt.contact_id,
          message_type: "template",
          template_name: template.name,
          template_language: template.language,
          template_message_params: {
            body: values.body,
            headerText: values.headerText,
            buttonParams: values.buttonParams,
          },
          template_params: values.body,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `HTTP ${res.status}`);
      toast.success(t("messageSent"));
    } catch (err) {
      const reason = err instanceof Error ? err.message : "network error";
      toast.error(t("messageFailed", { reason }));
    } finally {
      setSendingId(null);
    }
  }

  const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric" });

  const hasAnyAction = !!unconfirmed || !!noShow || !!freeBlock;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-foreground">{t("occupancyTitle")}</h3>
        {!occupancy || occupancy.overallPercent === null ? (
          <p className="text-xs text-muted-foreground">{t("noSchedule")}</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-foreground">{occupancy.overallPercent}%</span>
              <span className="text-xs text-muted-foreground">
                {t("slotsFraction", { booked: occupancy.bookedSlots, total: occupancy.totalSlots })}
              </span>
            </div>
            <div className="mt-3.5 flex flex-col gap-2.5">
              {occupancy.perDoctor.map((d) => (
                <div key={d.doctorId}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{d.doctorName}</span>
                    <span className="font-medium text-foreground">
                      {d.percent === null ? t("noScheduleShort") : `${d.percent}%`}
                    </span>
                  </div>
                  {d.percent !== null && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, d.percent)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("actionsTitle")}</h3>
            <p className="text-[11.5px] text-muted-foreground">{t("actionsSubtitle")}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => { setWaitlistDoctorId(null); setWaitlistOpen(true); }}>
            <ListChecks className="size-3.5" />
            {t("viewWaitlist")}
          </Button>
        </div>

        {loadingActions ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : !hasAnyAction ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("noActions")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {unconfirmed && (
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {unconfirmed.contact?.name || unconfirmed.contact?.phone}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {t("unconfirmedToday", { time: timeFormatter.format(new Date(unconfirmed.start_at)) })}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1.5 h-7 text-xs"
                    disabled={sendingId === unconfirmed.id}
                    onClick={() => sendConfirmationRequest(unconfirmed)}
                  >
                    {sendingId === unconfirmed.id ? <Loader2 className="size-3 animate-spin" /> : null}
                    {t("sendConfirmation")}
                  </Button>
                </div>
              </div>
            )}

            {noShow && (
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {noShow.contact?.name || noShow.contact?.phone}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {noShow.hasAcceptedQuote ? t("noShowWithPlan") : t("noShowPlain")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1.5 h-7 text-xs"
                    disabled={sendingId === noShow.id}
                    onClick={() => sendConfirmationRequest(noShow)}
                  >
                    {sendingId === noShow.id ? <Loader2 className="size-3 animate-spin" /> : null}
                    {t("rebook")}
                  </Button>
                </div>
              </div>
            )}

            {freeBlock && (
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {t("freeBlockDay", { day: dayFormatter.format(freeBlock.start) })} ·{" "}
                    {timeFormatter.format(freeBlock.start)}–{timeFormatter.format(freeBlock.end)}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {t("freeBlockDoctor", { doctor: freeBlock.doctorName, hours: Math.round((freeBlock.minutes / 60) * 10) / 10 })}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1.5 h-7 text-xs"
                    onClick={() => {
                      setWaitlistDoctorId(freeBlock.doctorId);
                      setWaitlistOpen(true);
                    }}
                  >
                    <CalendarClock className="size-3" />
                    {t("offerToWaitlist")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <TemplatePicker
        open={!!templateFor}
        onOpenChange={(next) => !next && setTemplateFor(null)}
        onSelect={handleTemplateSelected}
      />

      <WaitlistDialog
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        doctors={doctors}
        serviceTypes={serviceTypes}
        initialDoctorId={waitlistDoctorId}
        onChanged={() => void fetchActionItems()}
      />
    </div>
  );
}
