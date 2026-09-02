import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { findExistingContact, findExistingContactByEmail } from "@/lib/contacts/dedupe";
import { resolveFeatureAccess, type FeatureOverrides } from "@/lib/billing-platform/features";
import type { Plan } from "@/lib/billing-platform/plans";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { hasIntakeFormContent, type IntakeFormConfig } from "@/lib/intake-forms/types";

interface LookupBody {
  phone?: string;
  email?: string;
  doctor_id?: string;
}

/**
 * POST /api/public/booking/[slug]/lookup-patient — the booking
 * wizard's "have we seen this patient before" step. A phone/email
 * match against `contacts` means a returning patient: the widget
 * skips the intake form entirely. No match means a new patient: the
 * widget shows the chosen doctor's intake form before confirming.
 *
 * Deliberately returns as little as possible — `{found, hasName}`,
 * plus the doctor's intake form ONLY when not found — never the
 * contact's name/email/id. Echoing identity back would turn this
 * public, unauthenticated route into a phone/email → identity oracle.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`public-booking-lookup:${ip}`, RATE_LIMITS.publicBookingLookup);
  if (!limit.success) return rateLimitResponse(limit);

  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as LookupBody | null;
  if (!body?.phone && !body?.email) {
    return NextResponse.json({ error: "phone or email is required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: account } = await admin
    .from("accounts")
    .select("id, public_booking_enabled, plan, feature_overrides")
    .eq("public_booking_slug", slug)
    .maybeSingle();
  if (!account || !account.public_booking_enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let existing = body.phone ? await findExistingContact(admin, account.id, body.phone) : null;
  if (!existing && body.email) {
    existing = await findExistingContactByEmail(admin, account.id, body.email);
  }

  if (existing) {
    return NextResponse.json({ found: true, hasName: !!existing.name });
  }

  // New patient — hand back the chosen doctor's intake form (when the
  // account has the feature and the doctor configured one) so the
  // widget doesn't need a second round-trip to fetch it.
  let intakeFormConfig: IntakeFormConfig | null = null;
  if (body.doctor_id) {
    const intakeFormsEnabled = resolveFeatureAccess(
      account.plan as Plan,
      "intake_forms",
      account.feature_overrides as FeatureOverrides | null,
    );
    if (intakeFormsEnabled) {
      const { data: doctor } = await admin
        .from("doctors")
        .select("intake_form_config")
        .eq("id", body.doctor_id)
        .eq("account_id", account.id)
        .maybeSingle();
      const config = (doctor?.intake_form_config as IntakeFormConfig | null) ?? null;
      if (hasIntakeFormContent(config)) intakeFormConfig = config;
    }
  }

  return NextResponse.json({ found: false, hasName: false, intake_form_config: intakeFormConfig });
}
