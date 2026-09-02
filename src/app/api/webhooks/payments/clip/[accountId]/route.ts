import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/payments/admin-client";
import { handlePaymentWebhook } from "@/lib/payments/webhook-handler";

/** POST /api/webhooks/payments/clip/[accountId] — see
 *  src/lib/payments/providers/clip.ts for why this re-fetches the
 *  payment link status from Clip's API rather than trusting the push
 *  payload (Clip's webhook has no documented signature/secret at
 *  all). */
export async function POST(request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const { status, body } = await handlePaymentWebhook(supabaseAdmin(), "clip", accountId, request);
  return NextResponse.json(body, { status });
}
