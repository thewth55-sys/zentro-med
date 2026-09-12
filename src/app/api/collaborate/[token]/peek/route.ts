// ============================================================
// GET /api/collaborate/[token]/peek
//
// Public — no auth required. Lets /collaborate/[token] render
// "<Account> te invita a colaborar" before the visitor signs in.
// Mirrors /api/invitations/[token]/peek exactly (see that file for
// the full security-model writeup) but reads `collaborator_invitations`
// via the `peek_collaborator_invitation` RPC instead.
// ============================================================

import { NextResponse } from "next/server";

import { hashInviteToken } from "@/lib/auth/invitations";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`collab-peek:${ip}`, RATE_LIMITS.invitationPeek);
  if (!limit.success) return rateLimitResponse(limit);

  const { token } = await params;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("peek_collaborator_invitation", {
    p_token_hash: hashInviteToken(token),
  });

  if (error) {
    console.error("[collaborate peek] rpc error:", error);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
