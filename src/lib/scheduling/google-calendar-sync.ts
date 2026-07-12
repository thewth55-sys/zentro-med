// ============================================================
// Google Calendar sync dispatch — "never throws" (mirrors
// lib/conversions/dispatch.ts and the webhook delivery pattern): a
// Google API hiccup should never fail the appointment write that
// triggered it. Called from the three places that change an
// appointment (POST /api/appointments, PATCH and DELETE
// /api/appointments/[id]) — see those routes for the call sites.
//
// Deliberately re-fetches the doctor row narrowly (not reusing the
// wildcard `doctor:doctors(*)` embed those routes already return to
// the client) — that embed would otherwise ship the doctor's
// encrypted refresh_token in the JSON response.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt } from "@/lib/whatsapp/encryption";
import {
  refreshAccessToken,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar/client";

interface SyncableAppointment {
  id: string;
  doctor_id: string | null;
  contact_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  google_calendar_event_id?: string | null;
}

async function resolveConnectedDoctor(supabase: SupabaseClient, doctorId: string) {
  const { data: doctor } = await supabase
    .from("doctors")
    .select("google_calendar_connected, google_calendar_id, google_refresh_token")
    .eq("id", doctorId)
    .maybeSingle();

  if (!doctor?.google_calendar_connected || !doctor.google_refresh_token) return null;
  return doctor;
}

/**
 * Create/update/cancel the Google Calendar event that mirrors this
 * appointment, based on its current `status`. No-ops silently (not
 * an error) when the appointment has no doctor, or the doctor hasn't
 * connected Google Calendar — the overwhelming majority of calls,
 * since most accounts never touch this feature.
 */
export async function syncAppointmentToGoogle(
  supabase: SupabaseClient,
  appointment: SyncableAppointment,
): Promise<void> {
  try {
    if (!appointment.doctor_id) return;

    const doctor = await resolveConnectedDoctor(supabase, appointment.doctor_id);
    if (!doctor) return;

    const accessToken = await refreshAccessToken(decrypt(doctor.google_refresh_token!));
    const calendarId = doctor.google_calendar_id || "primary";

    if (appointment.status === "cancelled") {
      if (appointment.google_calendar_event_id) {
        await deleteCalendarEvent(accessToken, calendarId, appointment.google_calendar_event_id);
        await supabase
          .from("appointments")
          .update({ google_calendar_event_id: null })
          .eq("id", appointment.id);
      }
      return;
    }

    let summary = "Cita";
    if (appointment.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("name, phone")
        .eq("id", appointment.contact_id)
        .maybeSingle();
      summary = contact?.name || contact?.phone || summary;
    }

    const eventInput = {
      summary: `Cita: ${summary}`,
      description: appointment.notes ?? undefined,
      startAt: appointment.start_at,
      endAt: appointment.end_at,
    };

    if (appointment.google_calendar_event_id) {
      await updateCalendarEvent(accessToken, calendarId, appointment.google_calendar_event_id, eventInput);
    } else {
      const eventId = await createCalendarEvent(accessToken, calendarId, eventInput);
      await supabase
        .from("appointments")
        .update({ google_calendar_event_id: eventId })
        .eq("id", appointment.id);
    }
  } catch (err) {
    console.error("[syncAppointmentToGoogle] failed (never throws):", err);
  }
}

/**
 * Removes the Google Calendar event for an appointment that's about
 * to be hard-deleted (DELETE /api/appointments/[id]) — called BEFORE
 * the row is deleted, since it needs doctor_id / google_calendar_event_id
 * off of it.
 */
export async function removeAppointmentFromGoogle(
  supabase: SupabaseClient,
  appointment: { doctor_id: string | null; google_calendar_event_id: string | null },
): Promise<void> {
  try {
    if (!appointment.doctor_id || !appointment.google_calendar_event_id) return;

    const doctor = await resolveConnectedDoctor(supabase, appointment.doctor_id);
    if (!doctor) return;

    const accessToken = await refreshAccessToken(decrypt(doctor.google_refresh_token!));
    const calendarId = doctor.google_calendar_id || "primary";
    await deleteCalendarEvent(accessToken, calendarId, appointment.google_calendar_event_id);
  } catch (err) {
    console.error("[removeAppointmentFromGoogle] failed (never throws):", err);
  }
}
