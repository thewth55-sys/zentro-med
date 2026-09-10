// ============================================================
// Small shared data-fetching helpers for the invoice/quote PDF
// routes — NOT a render helper (each route still owns its own
// `renderToBuffer` call, per the existing precedent), just the two
// extra lookups both the invoice and quote PDF/send-email routes
// need identically: the appointment this document was attended
// under (for the "Atendió" info-grid column), and each line item's
// linked tooth (for the "Diente" table column).
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export interface PdfAttendedBy {
  name: string;
  specialty: string | null;
  roomName: string | null;
  appointmentDate: string | null;
}

/** `appointmentId` comes from `invoices.appointment_id` /
 *  `quotes.appointment_id` — both nullable, so most documents won't
 *  have one and the "Atendió" column is simply omitted (see the
 *  document components' 2-vs-3-column handling). */
export async function fetchAttendedBy(
  supabase: SupabaseClient,
  appointmentId: string | null,
): Promise<PdfAttendedBy | null> {
  if (!appointmentId) return null;

  const { data: appointment } = await supabase
    .from("appointments")
    .select("start_at, doctor:doctors(name, specialty), room:rooms(name)")
    .eq("id", appointmentId)
    .maybeSingle();
  const doctor = Array.isArray(appointment?.doctor) ? appointment.doctor[0] : appointment?.doctor;
  const room = Array.isArray(appointment?.room) ? appointment.room[0] : appointment?.room;
  if (!doctor) return null;

  return {
    name: doctor.name,
    specialty: doctor.specialty ?? null,
    roomName: room?.name ?? null,
    appointmentDate: appointment?.start_at
      ? new Date(appointment.start_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
      : null,
  };
}

interface ToothLinkedItemRow {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  odontogram_tooth_id: string | null;
}

/** Resolves each line item's `odontogram_tooth_id` FK to the actual
 *  FDI tooth number shown in the "Diente" column — a single batched
 *  lookup rather than one join per item, since `invoice_items`/
 *  `quote_items` don't PostgREST-embed `odontogram_teeth` today. */
export async function resolveToothNumbers(
  supabase: SupabaseClient,
  rows: ToothLinkedItemRow[],
): Promise<Map<string, number>> {
  const toothIds = [...new Set(rows.map((r) => r.odontogram_tooth_id).filter((id): id is string => Boolean(id)))];
  if (toothIds.length === 0) return new Map();

  const { data: teeth } = await supabase.from("odontogram_teeth").select("id, tooth_number").in("id", toothIds);
  return new Map((teeth ?? []).map((t) => [t.id as string, t.tooth_number as number]));
}
