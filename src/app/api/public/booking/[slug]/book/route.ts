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
import { denormalizeAnswers, getMissingRequiredFieldIds, resolveNextPageId } from "@/lib/intake-forms/evaluate";
import { hasIntakeFormContent, type IntakeFormConfig } from "@/lib/intake-forms/types";

interface BookBody {
  doctor_id?: string;
  service_type_id?: string;
  start_at?: string;
  name?: string;
  phone?: string;
  email?: string;
  room_id?: string;
  /** Only meaningful for a NEW patient (no existing contact match) —
   *  the doctor's intake form answers, keyed by field id. Ignored for
   *  a returning patient even if present. */
  intake_answers?: Array<{ field_id: string; value: string }>;
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

  // `name` is intentionally NOT required here — a returning patient
  // whose contact already has a name (lookup-patient's `hasName`)
  // never gets asked for it again by the widget (confirm-step.tsx),
  // so requiring it unconditionally rejects every recurring booking
  // with a 400. It's enforced further down, only for a genuinely new
  // contact (no existing match), right where it's actually used.
  if (!body?.doctor_id || !body.service_type_id || !body.start_at || !body.phone) {
    return NextResponse.json(
      { error: "doctor_id, service_type_id, start_at and phone are required" },
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
      .select("id, name, intake_form_config")
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
  const isNewPatient = !existingContact;

  if (isNewPatient && !body.name?.trim()) {
    return NextResponse.json({ error: "name is required for a new patient" }, { status: 400 });
  }
  // Solo pacientes recurrentes conocidos (existingContact con nombre)
  // llegan aquí sin body.name — usa el nombre ya guardado para las
  // notificaciones/checkout en vez de una cadena vacía.
  const patientName = body.name?.trim() || existingContact?.name || "";

  // Server-side intake-form validation — the real trust boundary for
  // an unauthenticated route. Walks the doctor's config the same way
  // the client wizard does (shared src/lib/intake-forms/evaluate.ts),
  // rejecting a new patient's submission when a currently-visible
  // required field has no answer, regardless of what the client
  // claimed. `visited` guards against an infinite loop if a malformed
  // config has a page-jump cycle.
  const intakeFormConfig = doctor.intake_form_config as IntakeFormConfig | null;
  if (isNewPatient && intakeFormConfig && hasIntakeFormContent(intakeFormConfig)) {
    const answers: Record<string, string> = {};
    for (const a of body.intake_answers ?? []) {
      if (a?.field_id) answers[a.field_id] = a.value ?? "";
    }
    const pages = intakeFormConfig.pages;
    const visited = new Set<string>();
    const missing: string[] = [];
    let page: (typeof pages)[number] | null = pages[0] ?? null;
    while (page && !visited.has(page.id)) {
      visited.add(page.id);
      missing.push(...getMissingRequiredFieldIds(page, answers));
      if (missing.length > 0) break;
      const nextId = resolveNextPageId(page, answers, pages);
      page = nextId ? (pages.find((p) => p.id === nextId) ?? null) : null;
    }
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Faltan respuestas obligatorias en el formulario de admisión.", missing_field_ids: missing },
        { status: 400 },
      );
    }
  }

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

  // Formulario de admisión (nuevo paciente, opcional): la cita ya
  // quedó creada arriba sin importar lo que pase de aquí en adelante
  // — mejor una cita sin respuestas guardadas que perder la reserva.
  // A diferencia del checkout de anticipo (más abajo), este fallo NO
  // se traga en silencio: intakeSaveFailed llega en la respuesta para
  // que el widget avise al paciente en vez de fingir éxito total —
  // perder sin aviso datos de pre-evaluación clínica es peor que
  // perder un link de pago.
  let intakeSaveFailed = false;
  if (isNewPatient && intakeFormConfig && body.intake_answers?.length) {
    try {
      const answers: Record<string, string> = {};
      for (const a of body.intake_answers) {
        if (a?.field_id) answers[a.field_id] = a.value ?? "";
      }
      const { error: submissionError } = await admin.from("intake_form_submissions").insert({
        account_id: account.id,
        contact_id: contactId,
        doctor_id: doctor.id,
        appointment_id: appointment.id,
        answers: denormalizeAnswers(intakeFormConfig, answers),
      });
      if (submissionError) throw submissionError;
    } catch (err) {
      console.error("[public booking] intake form submission save failed:", err);
      intakeSaveFailed = true;
    }
  }

  const startLabel = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(startAt);
  void notifyAccountTeam(admin, {
    accountId: account.id,
    subject: `Nueva cita agendada — ${patientName}`,
    heading: "Nueva cita agendada en línea",
    bodyHtml: `<p><strong>${escapeHtml(patientName)}</strong> agendó una cita para <strong>${escapeHtml(startLabel)}</strong> con ${escapeHtml(doctor.name)} (${escapeHtml(serviceType.name)}).</p><p>Teléfono: ${escapeHtml(body.phone)}</p>`,
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
        customerName: patientName,
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

  return NextResponse.json({ appointment, checkoutUrl, intakeSaveFailed });
}
