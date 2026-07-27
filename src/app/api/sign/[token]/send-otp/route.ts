// ============================================================
// POST /api/sign/[token]/send-otp
//
// Public. Generates a fresh 6-digit code, stores its hash via the
// request_signature_otp RPC, and emails the plaintext code to
// signature_requests.delivered_to_email (never an address the caller
// supplies — see the /send route's comment). Rate-limited per IP; the
// RPC itself also refuses an expired/already-signed request.
// ============================================================

import { NextResponse } from "next/server";

import {
  generateOtpCode,
  hashOtpCode,
  hashSignatureToken,
  otpExpiry,
} from "@/lib/signatures/tokens";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend-client";
import { renderBrandedEmail } from "@/lib/email/branded-template";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`sign-send-otp:${ip}`, RATE_LIMITS.signatureOtpSend);
  if (!limit.success) return rateLimitResponse(limit);

  const { token } = await params;
  if (!token) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  const code = generateOtpCode();
  const expiresAt = otpExpiry();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_signature_otp", {
    p_token_hash: hashSignatureToken(token),
    p_otp_code_hash: hashOtpCode(code),
    p_expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("[sign/send-otp] rpc error:", error);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
  if (!data?.ok) {
    return NextResponse.json(data, { status: 200 });
  }

  const html = renderBrandedEmail({
    heading: "Tu código de verificación",
    bodyHtml: `
      <p>Usa este código para confirmar tu identidad y firmar el documento:</p>
      <p style="font-size:32px;font-weight:800;letter-spacing:.1em;margin:20px 0;">${code}</p>
      <p style="font-size:13px;color:#666;">Vence en 10 minutos. Si no solicitaste esto, ignora este correo.</p>
    `,
    brandName: "Zentro Med",
    footerNote: "Código de verificación para firma de documento.",
  });

  try {
    await sendEmail({ to: data.delivered_to_email, subject: "Tu código de verificación", html });
  } catch (err) {
    console.error("[sign/send-otp] email send failed:", err);
    return NextResponse.json({ ok: false, reason: "email_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
