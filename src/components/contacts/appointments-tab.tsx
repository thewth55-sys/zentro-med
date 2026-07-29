"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { useCan } from "@/hooks/use-can";
import { AppointmentDocumentsDialog } from "@/components/agenda/appointment-documents-dialog";
import { AppointmentEditorDialog, type AppointmentDraft } from "@/components/agenda/appointment-editor-dialog";
import { Button } from "@/components/ui/button";
import type { Appointment, AppointmentStatus, Doctor, Room, ServiceType } from "@/types";

interface AppointmentsTabProps {
  contactId: string;
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  completed: "bg-primary/10 text-primary border-primary/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  no_show: "bg-red-500/10 text-red-400 border-red-500/30",
};

/**
 * Read-only appointment history for a patient — pulls every
 * appointment linked to this contact regardless of which deal (or no
 * deal at all) created it. Creating/editing stays in the deal panel
 * and the Agenda view; this tab is purely "what happened so far".
 */
export function AppointmentsTab({ contactId }: AppointmentsTabProps) {
  const t = useTranslations("Contacts.detailView.appointmentsTab");
  const tAppt = useTranslations("Pipelines.appointments");
  const canEdit = useCan("send-messages");

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [draft, setDraft] = useState<AppointmentDraft | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

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

  function openNewAppointment() {
    const start = new Date();
    start.setMinutes(start.getMinutes() - (start.getMinutes() % 30) + 30, 0, 0);
    const end = new Date(start.getTime() + 30 * 60000);
    setDraft({ mode: "create", startAt: start.toISOString(), endAt: end.toISOString(), contactId });
    setEditorOpen(true);
  }

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?contact_id=${contactId}`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setAppointments((data.appointments ?? []) as Appointment[]);
    } catch (err) {
      console.error("Failed to fetch appointment history:", err);
      toast.error(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [contactId, t]);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={openNewAppointment}>
            <Plus className="size-3.5" />
            {t("newAppointment")}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CalendarClock className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => (
            <button
              key={appt.id}
              type="button"
              onClick={() => setSelectedAppointment(appt)}
              className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-left text-sm hover:border-primary/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {dateFormatter.format(new Date(appt.start_at))}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[appt.status]}`}
                >
                  {tAppt(`status.${appt.status}`)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {appt.service_type?.name || tAppt("noServiceType")} ·{" "}
                {appt.doctor?.name || tAppt("noDoctor")} · {appt.room?.name || tAppt("noRoom")}
              </p>
              {appt.notes && <p className="mt-1 text-xs text-muted-foreground">{appt.notes}</p>}
              <p className="mt-1 text-[11px] text-primary">{t("viewDocuments")}</p>
            </button>
          ))}
        </div>
      )}

      {selectedAppointment && (
        <AppointmentDocumentsDialog
          open={!!selectedAppointment}
          onOpenChange={(open) => !open && setSelectedAppointment(null)}
          appointment={selectedAppointment}
          contactId={contactId}
        />
      )}

      <AppointmentEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        draft={draft}
        doctors={doctors}
        rooms={rooms}
        serviceTypes={serviceTypes}
        canEdit={canEdit}
        onSaved={fetchAppointments}
      />
    </div>
  );
}
