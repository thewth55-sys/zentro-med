// ============================================================
// POST /api/collaborate/[token]/accept
//
// Authenticated. Mirrors /api/invitations/[token]/redeem's shape,
// but calls `accept_collaborator_invitation` (137_account_collaborators.sql)
// instead of `redeem_invitation` — the RPC only inserts/upserts into
// `account_collaborators`; the caller's own `profiles.account_id`
// is never touched, so their own account is unaffected.
//
// Refusal contract (from the RPC):
//   - SQLSTATE 42501 → 401 (caller not authenticated)
//   - SQLSTATE 22023 → 400 (invitation not_found / used / expired)
// ============================================================

import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { hashInviteToken } from "@/lib/auth/invitations";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

function rpcErrorToResponse(err: PostgrestError): NextResponse {
  if (err.code === "42501") {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err.code === "22023") {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error("[collaborate accept] unexpected RPC error:", err);
  return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`collab-accept:${ip}`, RATE_LIMITS.invitationRedeem);
  if (!limit.success) return rateLimitResponse(limit);

  const { token } = await params;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing invitation token" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: hostAccountId, error } = await supabase.rpc("accept_collaborator_invitation", {
    p_token_hash: hashInviteToken(token),
  });

  if (error) return rpcErrorToResponse(error);

  return NextResponse.json({ ok: true, hostAccountId });
}
