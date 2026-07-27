// ============================================================
// POST /api/sign/[token]/verify-otp
//
// Public. Checks the submitted code against verify_signature_otp,
// which itself caps attempts at 6 per sent code (request_signature_otp
// resets that counter on a resend). Rate-limited per IP on top of
// that as an outer brake.
// ============================================================

import { NextResponse } from "next/server";

import { hashOtpCode, hashSignatureToken } from "@/lib/signatures/tokens";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`sign-verify-otp:${ip}`, RATE_LIMITS.signatureOtpVerify);
  if (!limit.success) return rateLimitResponse(limit);

  const { token } = await params;
  if (!token) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, reason: "invalid_code" });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_signature_otp", {
    p_token_hash: hashSignatureToken(token),
    p_otp_code_hash: hashOtpCode(code),
  });

  if (error) {
    console.error("[sign/verify-otp] rpc error:", error);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
