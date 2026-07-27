// ============================================================
// GET /api/sign/[token]/peek
//
// Public — no auth required. Lets the /firmar/<token> page render the
// document content and a masked "we'll email a code to ju***@..."
// hint before the patient does anything. Mirrors
// /api/invitations/[token]/peek exactly (see that route's comment for
// the token-hashing/rate-limit reasoning) — same shape, different table.
// ============================================================

import { NextResponse } from "next/server";

import { hashSignatureToken, maskEmail } from "@/lib/signatures/tokens";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`sign-peek:${ip}`, RATE_LIMITS.signaturePeek);
  if (!limit.success) return rateLimitResponse(limit);

  const { token } = await params;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("peek_signature_request", {
    p_token_hash: hashSignatureToken(token),
  });

  if (error) {
    console.error("[sign/peek] rpc error:", error);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }

  const payload = data as Record<string, unknown> | null;
  if (payload?.ok && typeof payload.delivered_to_email === "string") {
    const { delivered_to_email, ...rest } = payload;
    return NextResponse.json({ ...rest, delivered_to_email_masked: maskEmail(delivered_to_email) });
  }

  return NextResponse.json(payload);
}
