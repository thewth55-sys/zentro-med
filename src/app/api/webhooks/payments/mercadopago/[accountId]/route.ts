import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/payments/admin-client";
import { handlePaymentWebhook } from "@/lib/payments/webhook-handler";

/** POST /api/webhooks/payments/mercadopago/[accountId] — see
 *  src/lib/payments/providers/mercadopago.ts for why this re-fetches
 *  the payment from Mercado Pago's API rather than trusting the push
 *  payload. */
export async function POST(request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const { status, body } = await handlePaymentWebhook(supabaseAdmin(), "mercadopago", accountId, request);
  return NextResponse.json(body, { status });
}
