"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, CalendarDays } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

import { createClient } from "@/lib/supabase/client";
import { useCan } from "@/hooks/use-can";
import type { Appointment, AppointmentStatus, Doctor, DoctorAvailabilityBlock, Room, ServiceType } from "@/types";
import { AppointmentEditorDialog, type AppointmentDraft } from "./appointment-editor-dialog";

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; border: string }> = {
  pending: { bg: "#f59e0b", border: "#d97706" },
  confirmed: { bg: "#10b981", border: "#059669" },
  completed: { bg: "#6366f1", border: "#4f46e5" },
  cancelled: { bg: "#6b7280", border: "#4b5563" },
  no_show: { bg: "#ef4444", border: "#dc2626" },
};

const AVAILABILITY_PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#84cc16", "#f97316",
];

function colorForDoctor(doctorId: string): string {
  let hash = 0;
  for (let i = 0; i < doctorId.length; i++) hash = (hash * 31 + doctorId.charCodeAt(i)) >>> 0;
  return AVAILABILITY_PALETTE[hash % AVAILABILITY_PALETTE.length];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  display?: "background";
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: Record<string, unknown>;
}

export function AgendaCalendarView() {
  const t = useTranslations("Agenda");
  const tAppt = useTranslations("Pipelines.appointments");
  const locale = useLocale();
  const canEdit = useCan("send-messages");

  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<DoctorAvailabilityBlock[]>([]);

  const [doctorFilter, setDoctorFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<AppointmentDraft | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [d, r, s] = await Promise.all([
        supabase.from("doctors").select("*").eq("is_active", true).order("name"),
        supabase.from("rooms").select("*").eq("is_active", true).order("name"),
        supabase.from("service_types").select("*").eq("is_active", true).order("name"),
      ]);
      setDoctors((d.data ?? []) as Doctor[]);
      setRooms((r.data ?? []) as Room[]);
      setServiceTypes((s.data ?? []) as ServiceType[]);
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to });
      if (doctorFilter) params.set("doctor_id", doctorFilter);
      if (roomFilter) params.set("room_id", roomFilter);
      const apptRes = await fetch(`/api/appointments?${params.toString()}`);
      const apptData = await apptRes.json();
      setAppointments((apptData.appointments ?? []) as Appointment[]);

      const supabase = createClient();
      let blockQuery = supabase
        .from("doctor_availability_blocks")
        .select("*")
        .gte("end_at", range.from)
        .lte("start_at", range.to);
      if (doctorFilter) blockQuery = blockQuery.eq("doctor_id", doctorFilter);
      const { data: blocks, error } = await blockQuery;
      if (error) throw error;
      setAvailabilityBlocks((blocks ?? []) as DoctorAvailabilityBlock[]);
    } catch (err) {
      console.error("Failed to load agenda data:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [range, doctorFilter, roomFilter, t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const events = useMemo<CalendarEvent[]>(() => {
    const apptEvents: CalendarEvent[] = appointments
      .filter((a) => a.status !== "cancelled")
      .map((a) => {
        const colors = STATUS_COLORS[a.status];
        return {
          id: a.id,
          title:
            (a.contact?.name || a.contact?.phone || t("noContactSelected")) +
            (a.room ? ` · ${a.room.name}` : ""),
          start: a.start_at,
          end: a.end_at,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: "#fff",
          extendedProps: { type: "appointment", appointment: a },
        };
      });

    const blockEvents: CalendarEvent[] = availabilityBlocks
      .filter((b) => !doctorFilter || b.doctor_id === doctorFilter)
      .map((b) => ({
        id: `block-${b.id}`,
        title: doctors.find((d) => d.id === b.doctor_id)?.name ?? "",
        start: b.start_at,
        end: b.end_at,
        display: "background" as const,
        backgroundColor: colorForDoctor(b.doctor_id),
        extendedProps: { type: "availability", block: b },
      }));

    return [...blockEvents, ...apptEvents];
  }, [appointments, availabilityBlocks, doctorFilter, doctors, t]);

  function handleEventClick(info: EventClickArg) {
    const type = info.event.extendedProps.type;
    if (type !== "appointment") return;
    const appointment = info.event.extendedProps.appointment as Appointment;
    setDraft({ mode: "edit", appointment });
    setEditorOpen(true);
  }

  async function handleEventDrop(info: EventDropArg) {
    const type = info.event.extendedProps.type;
    if (type !== "appointment" || !info.event.start || !info.event.end) {
      info.revert();
      return;
    }
    const appointment = info.event.extendedProps.appointment as Appointment;
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: info.event.start.toISOString(),
          end_at: info.event.end.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("reschedule failed");
      toast.success(tAppt("updated"));
      await fetchData();
    } catch (err) {
      console.error("Reschedule failed:", err);
      toast.error(t("rescheduleFailed"));
      info.revert();
    }
  }

  async function handleEventResize(info: EventResizeDoneArg) {
    const type = info.event.extendedProps.type;
    if (type !== "appointment" || !info.event.start || !info.event.end) {
      info.revert();
      return;
    }
    const appointment = info.event.extendedProps.appointment as Appointment;
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: info.event.start.toISOString(),
          end_at: info.event.end.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("reschedule failed");
      toast.success(tAppt("updated"));
      await fetchData();
    } catch (err) {
      console.error("Resize failed:", err);
      toast.error(t("rescheduleFailed"));
      info.revert();
    }
  }

  function handleSelect(info: { startStr: string; endStr: string; view: { calendar: { unselect: () => void } } }) {
    if (!canEdit) return;
    setDraft({
      mode: "create",
      startAt: info.startStr,
      endAt: info.endStr,
      doctorId: doctorFilter || undefined,
      roomId: roomFilter || undefined,
    });
    setEditorOpen(true);
    info.view.calendar.unselect();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <CalendarDays className="size-6 text-primary" />
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {!canEdit && (
          <p className="hidden max-w-xs text-right text-xs text-muted-foreground sm:block">{t("readOnly")}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          className="h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground outline-none focus:border-primary"
        >
          <option value="">{t("allDoctors")}</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground outline-none focus:border-primary"
        >
          <option value="">{t("allRooms")}</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth,listWeek",
          }}
          height={700}
          firstDay={1}
          // Full 24h range so appointments outside a "typical" clinic
          // window are never silently hidden by the grid — FullCalendar
          // drops out-of-range events with no warning. scrollTime just
          // picks where the view opens; slotMin/MaxTime stays wide open.
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          scrollTime="07:00:00"
          nowIndicator
          locale={locale === "es" ? esLocale : undefined}
          events={events}
          editable={canEdit}
          selectable={canEdit}
          selectMirror
          unselectAuto
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          select={handleSelect}
          datesSet={(arg) => {
            setRange({ from: arg.start.toISOString(), to: arg.end.toISOString() });
          }}
        />
      </div>

      <AppointmentEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        draft={draft}
        doctors={doctors}
        rooms={rooms}
        serviceTypes={serviceTypes}
        canEdit={canEdit}
        onSaved={() => void fetchData()}
      />
    </div>
  );
}
