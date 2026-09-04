import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { reconcileDeposit } from "@/lib/payments/reconcile-deposit";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/public/booking/[slug]/deposit-status?ref=<external_reference>
 *
 * Polled by the post-checkout confirmation page while a deposit is
 * still 'pending' — actively re-checks the gateway (reconcileDeposit)
 * instead of only waiting for its webhook, which can simply never
 * arrive. Public/unauthenticated by design, same trust boundary as
 * the rest of /api/public/booking: `ref` is a 256-bit-ish random UUID
 * we generated (appointment_deposits.external_reference), not
 * enumerable, and this only ever returns status/amount/appointment
 * time+room — never contact/payment details.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`public-deposit-status:${ip}`, RATE_LIMITS.publicDepositStatus);
  if (!limit.success) return rateLimitResponse(limit);

  const { slug } = await params;
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  if (!ref) {
    return NextResponse.json({ error: "ref is required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: account } = await admin
    .from("accounts")
    .select("id")
    .eq("public_booking_slug", slug)
    .maybeSingle();
  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: depositRow } = await admin
    .from("appointment_deposits")
    .select("id")
    .eq("external_reference", ref)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!depositRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await reconcileDeposit(admin, account.id, depositRow.id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: appointment } = await admin
    .from("appointments")
    .select("start_at, room:rooms(name, address)")
    .eq("id", result.appointmentId)
    .maybeSingle();

  return NextResponse.json({
    status: result.status,
    amount: result.amount,
    currency: result.currency,
    appointment: appointment ? { start_at: appointment.start_at, room: appointment.room ?? null } : null,
  });
}
