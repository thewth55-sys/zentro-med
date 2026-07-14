import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { verifyCalComWebhookSignature } from "@/lib/cal-com/webhook-signature";

/**
 * POST /api/integrations/cal-com/webhook/[accountId] — inbound
 * receiver for Cal.com bookings, the "Phase B" this codebase has
 * carried scaffolding for since migration 037 (`appointments.source`
 * already accepts 'cal_com', `cal_com_booking_uid` already exists and
 * is uniquely indexed).
 *
 * SETUP (manual, per clinic that wants this — nothing here is wired
 * into any in-app settings UI yet):
 *   1. In Cal.com → Settings → Developer → Webhooks, add an endpoint
 *      pointing at this route with this account's id in the URL,
 *      subscribed to Booking Created / Cancelled / Rescheduled.
 *   2. Set the webhook's secret to this deployment's
 *      CAL_COM_WEBHOOK_SECRET value (see .env.local.example) — every
 *      account on this deployment currently shares one secret. A
 *      later pass could move this to a per-account column +
 *      Settings → Scheduling card (mirroring public-booking-settings)
 *      once there's a real customer asking for it.
 *
 * WHAT THIS DOES vs. DOESN'T DO:
 *   Does: verify the signature, create/update/cancel an Appointment
 *   keyed by cal_com_booking_uid, best-effort match the doctor by the
 *   organizer's email, best-effort match/attach an existing Contact
 *   by the attendee's email.
 *   Doesn't: create a NEW Contact when there's no phone number to
 *   satisfy `contacts.phone NOT NULL` — Cal.com's default booking
 *   form collects email, not phone. In that case the appointment is
 *   still created with `contact_id = null` and the attendee's
 *   name/email recorded in `notes` so staff can reconcile manually.
 *   Doesn't: push this clinic's availability TO Cal.com (the
 *   `unionRanges` helper in availability.ts exists for that but has
 *   no caller yet), and has no in-app "Connect Cal.com" UI/OAuth —
 *   both are real future work, not done here.
 */

interface CalComAttendee {
  email?: string;
  name?: string;
}

interface CalComPayload {
  uid: string;
  rescheduleUid?: string;
  startTime: string;
  endTime: string;
  organizer?: { email?: string };
  attendees?: CalComAttendee[];
}

interface CalComWebhookBody {
  triggerEvent: string;
  payload: CalComPayload;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params;
  const rawBody = await request.text();

  const secret = process.env.CAL_COM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[cal.com webhook] CAL_COM_WEBHOOK_SECRET is not set — rejecting request.");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const signature = request.headers.get("x-cal-signature-256");
  if (!verifyCalComWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: CalComWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { triggerEvent, payload } = body;
  if (!payload?.uid) {
    // Event type we don't care about, or a malformed payload — ack
    // it anyway so Cal.com doesn't retry forever.
    return NextResponse.json({ ok: true });
  }

  const admin = supabaseAdmin();
  const { data: account } = await admin.from("accounts").select("id").eq("id", accountId).maybeSingle();
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (triggerEvent === "BOOKING_CANCELLED") {
    await admin
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("account_id", accountId)
      .eq("cal_com_booking_uid", payload.uid);
    return NextResponse.json({ ok: true });
  }

  if (triggerEvent !== "BOOKING_CREATED" && triggerEvent !== "BOOKING_RESCHEDULED") {
    return NextResponse.json({ ok: true });
  }

  // Best-effort doctor match: organizer's email -> profiles.email ->
  // linked doctors row. No match just leaves doctor_id null for staff
  // to assign, same as any lead-originated appointment.
  let doctorId: string | null = null;
  if (payload.organizer?.email) {
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("account_id", accountId)
      .eq("email", payload.organizer.email)
      .maybeSingle();
    if (profile) {
      const { data: doctor } = await admin
        .from("doctors")
        .select("id")
        .eq("account_id", accountId)
        .eq("user_id", profile.user_id)
        .maybeSingle();
      doctorId = doctor?.id ?? null;
    }
  }

  // Best-effort contact match by email — see the file-level comment
  // for why we don't create a new Contact here when there's no phone.
  const attendee = payload.attendees?.[0];
  let contactId: string | null = null;
  let unmatchedAttendeeNote: string | null = null;
  if (attendee?.email) {
    const { data: contact } = await admin
      .from("contacts")
      .select("id")
      .eq("account_id", accountId)
      .eq("email", attendee.email)
      .maybeSingle();
    if (contact) {
      contactId = contact.id;
    } else {
      unmatchedAttendeeNote = `Cal.com: ${attendee.name || "sin nombre"} <${attendee.email}> (sin contacto vinculado — sin teléfono en la reserva)`;
    }
  }

  const existingUid = payload.rescheduleUid || payload.uid;
  const { data: existing } = await admin
    .from("appointments")
    .select("id")
    .eq("account_id", accountId)
    .eq("cal_com_booking_uid", existingUid)
    .maybeSingle();

  const fields = {
    account_id: accountId,
    contact_id: contactId,
    doctor_id: doctorId,
    start_at: payload.startTime,
    end_at: payload.endTime,
    status: "confirmed" as const,
    source: "cal_com" as const,
    cal_com_booking_uid: payload.uid,
    notes: unmatchedAttendeeNote,
  };

  if (existing) {
    await admin.from("appointments").update(fields).eq("id", existing.id);
  } else {
    await admin.from("appointments").insert(fields);
  }

  return NextResponse.json({ ok: true });
}
