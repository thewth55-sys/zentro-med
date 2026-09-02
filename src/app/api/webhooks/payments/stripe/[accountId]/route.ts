import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/payments/admin-client";
import { handlePaymentWebhook } from "@/lib/payments/webhook-handler";

/**
 * POST /api/webhooks/payments/stripe/[accountId] — per-account Stripe
 * webhook for the deposit gateway. Not to be confused with
 * /api/webhooks/stripe (Zentro Med's OWN Stripe account billing
 * clinics for their SaaS subscription) — this one is Stripe events
 * from a CLINIC's own Stripe account, keyed by account in the URL
 * since each account has its own webhook signing secret.
 */
export async function POST(request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const { status, body } = await handlePaymentWebhook(supabaseAdmin(), "stripe", accountId, request);
  return NextResponse.json(body, { status });
}
