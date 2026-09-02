import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { findExistingContact, isUniqueViolation } from "@/lib/contacts/dedupe";
import { normalizePhone } from "@/lib/whatsapp/phone-utils";
import { computeAvailableSlots } from "@/lib/scheduling/public-booking";
import { resolveFeatureAccess, type FeatureOverrides } from "@/lib/billing-platform/features";
import type { Plan } from "@/lib/billing-platform/plans";
import { notifyAccountTeam } from "@/lib/email/notify-team";
import { escapeHtml } from "@/lib/email/branded-template";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { loadActivePaymentGatewayConfig } from "@/lib/payments/config";
import { getPaymentAdapter } from "@/lib/payments/gateway";

interface BookBody {
  doctor_id?: string;
  service_type_id?: string;
  start_at?: string;
  name?: string;
  phone?: string;
  email?: string;
  room_id?: string;
}

/**
 * POST /api/public/booking/[slug]/book — creates a Contact (deduped
 * by phone, same helper the WhatsApp webhook/manual form/CSV import
 * use) and an Appointment with source='public_booking'.
 *
 * Re-validates the requested slot against `computeAvailableSlots`
 * right before inserting — the widget's earlier GET .../slots call
 * could be stale by the time the visitor submits (another visitor
 * took the slot, or staff booked it manually in between). Fails
 * closed on any mismatch rather than trusting the client-submitted
 * start/end.
 *
 * When the account has an active payment-gateway config (premium,
 * see payment_gateway_configs), the appointment is still created here
 * (as 'pending', same as always) but the response also carries a
 * `checkoutUrl` — the widget redirects the visitor there to pay the
 * deposit instead of showing "confirmed" immediately. The appointment
 * itself doesn't have its own "deposit paid" status; that lives on
 * the appointment_deposits row the three provider webhooks update.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`public-booking-create:${ip}`, RATE_LIMITS.publicBookingCreate);
  if (!limit.success) return rateLimitResponse(limit);

  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as BookBody | null;

  if (!body?.doctor_id || !body.service_type_id || !body.start_at || !body.name || !body.phone) {
    return NextResponse.json(
      { error: "doctor_id, service_type_id, start_at, name and phone are required" },
      { status: 400 },
    );
  }
  const normalizedPhone = normalizePhone(body.phone);
  if (normalizedPhone.length < 8) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: account } = await admin
    .from("accounts")
    .select("id, owner_user_id, public_booking_enabled, plan, feature_overrides")
    .eq("public_booking_slug", slug)
    .maybeSingle();
  if (!account || !account.public_booking_enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const clinicHoursEnabled = resolveFeatureAccess(
    account.plan as Plan,
    "clinic_hours",
    account.feature_overrides as FeatureOverrides | null,
  );

  // Consultorio (opcional): solo se usa/valida cuando la cuenta tiene la
  // feature premium; si no, se ignora y la cita queda sin consultorio (igual
  // que antes). Debe pertenecer a la cuenta y estar activo.
  let roomId: string | null = null;
  if (clinicHoursEnabled && body.room_id) {
    const { data: room } = await admin
      .from("rooms")
      .select("id")
      .eq("id", body.room_id)
      .eq("account_id", account.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    roomId = room.id;
  }

  const [{ data: doctor }, { data: serviceType }] = await Promise.all([
    admin
      .from("doctors")
      .select("id, name")
      .eq("id", body.doctor_id)
      .eq("account_id", account.id)
      .eq("is_active", true)
      .maybeSingle(),
    admin
      .from("service_types")
      .select("id, name, duration_minutes")
      .eq("id", body.service_type_id)
      .eq("account_id", account.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (!doctor || !serviceType) {
    return NextResponse.json({ error: "Doctor or service type not found" }, { status: 404 });
  }

  const startAt = new Date(body.start_at);
  if (Number.isNaN(startAt.getTime()) || startAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Invalid or past start_at" }, { status: 400 });
  }
  const endAt = new Date(startAt.getTime() + serviceType.duration_minutes * 60_000);

  // Re-check the slot is still free, scoped tightly to just this
  // candidate window (cheap — one doctor, one day).
  const dayStart = new Date(startAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const freshSlots = await computeAvailableSlots(admin, {
    accountId: account.id,
    doctorId: doctor.id,
    slotMinutes: serviceType.duration_minutes,
    rangeStart: dayStart.toISOString(),
    rangeEnd: dayEnd.toISOString(),
    roomId,
    useClinicHours: clinicHoursEnabled,
  });
  const stillAvailable = freshSlots.some((s) => s.start_at === startAt.toISOString());
  if (!stillAvailable) {
    return NextResponse.json(
      { error: "That slot is no longer available. Please pick another." },
      { status: 409 },
    );
  }

  const existingContact = await findExistingContact(admin, account.id, body.phone);
  let contactId: string;
  if (existingContact) {
    contactId = existingContact.id;
  } else {
    const { data: newContact, error: createError } = await admin
      .from("contacts")
      .insert({
        account_id: account.id,
        user_id: account.owner_user_id,
        phone: body.phone,
        name: body.name,
        email: body.email || null,
      })
      .select("id")
      .single();
    if (createError) {
      if (isUniqueViolation(createError)) {
        const raced = await findExistingContact(admin, account.id, body.phone);
        if (!raced) {
          return NextResponse.json({ error: "Could not create contact" }, { status: 500 });
        }
        contactId = raced.id;
      } else {
        console.error("[public booking] contact create failed:", createError);
        return NextResponse.json({ error: "Could not create contact" }, { status: 500 });
      }
    } else {
      contactId = newContact.id;
    }
  }

  const { data: appointment, error: apptError } = await admin
    .from("appointments")
    .insert({
      account_id: account.id,
      contact_id: contactId,
      doctor_id: doctor.id,
      room_id: roomId,
      service_type_id: serviceType.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "pending",
      source: "public_booking",
    })
    .select("id, start_at, end_at")
    .single();

  if (apptError) {
    console.error("[public booking] appointment create failed:", apptError);
    return NextResponse.json({ error: "Could not create appointment" }, { status: 500 });
  }

  const startLabel = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(startAt);
  void notifyAccountTeam(admin, {
    accountId: account.id,
    subject: `Nueva cita agendada — ${body.name}`,
    heading: "Nueva cita agendada en línea",
    bodyHtml: `<p><strong>${escapeHtml(body.name)}</strong> agendó una cita para <strong>${escapeHtml(startLabel)}</strong> con ${escapeHtml(doctor.name)} (${escapeHtml(serviceType.name)}).</p><p>Teléfono: ${escapeHtml(body.phone)}</p>`,
  });

  // Anticipo (premium, opcional): la cita ya quedó creada arriba
  // igual que siempre; esto solo agrega un checkout externo encima.
  // Si algo falla aquí, la cita sigue existiendo — mejor una cita sin
  // cobro que perder la reserva por un error de la pasarela.
  const gatewayConfig = await loadActivePaymentGatewayConfig(admin, account.id);
  let checkoutUrl: string | null = null;
  if (gatewayConfig && gatewayConfig.depositAmount > 0) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://med.zentrolabs.com";
      const { data: depositRow, error: depositErr } = await admin
        .from("appointment_deposits")
        .insert({
          account_id: account.id,
          appointment_id: appointment.id,
          provider: gatewayConfig.provider,
          amount: gatewayConfig.depositAmount,
          currency: gatewayConfig.currency,
        })
        .select("id, external_reference")
        .single();
      if (depositErr) throw depositErr;

      const successUrl = `${siteUrl}/agendar/${encodeURIComponent(slug)}/confirmacion?deposit=${depositRow.external_reference}`;
      const cancelUrl = `${siteUrl}/agendar/${encodeURIComponent(slug)}?deposit_canceled=1`;
      const webhookUrl = `${siteUrl}/api/webhooks/payments/${gatewayConfig.provider}/${account.id}`;

      const result = await getPaymentAdapter(gatewayConfig.provider).createCheckout(gatewayConfig.credentials, {
        amount: gatewayConfig.depositAmount,
        currency: gatewayConfig.currency,
        description: `Anticipo — cita ${startLabel}`,
        externalReference: depositRow.external_reference,
        successUrl,
        cancelUrl,
        webhookUrl,
        customerName: body.name,
        customerPhone: body.phone,
        customerEmail: body.email || undefined,
      });

      await admin
        .from("appointment_deposits")
        .update({ external_checkout_id: result.externalCheckoutId, checkout_url: result.checkoutUrl })
        .eq("id", depositRow.id);

      checkoutUrl = result.checkoutUrl;
    } catch (err) {
      console.error("[public booking] deposit checkout creation failed:", err);
      // Swallow: the appointment stays booked, just without a deposit
      // link. Staff can still see/confirm it manually.
    }
  }

  return NextResponse.json({ appointment, checkoutUrl });
}
