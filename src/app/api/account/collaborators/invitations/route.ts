// ============================================================
// /api/account/collaborators/invitations
//
//   GET  — list outstanding (un-accepted, non-expired) collaborator
//          invites for this account.
//   POST — create a new one.
//
// Admin+. Mirrors /api/account/invitations (internal-member
// invites) — same token-hash-at-rest model, same "plaintext token
// returned exactly once" contract — but this creates a
// `collaborator_invitations` row, accepted via
// `accept_collaborator_invitation()` (137_account_collaborators.sql),
// which only ever inserts into `account_collaborators`. It never
// touches `profiles`, unlike `redeem_invitation()` — the whole point
// is that accepting does NOT move the collaborator's own account.
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { generateInviteToken, inviteExpiresAt } from "@/lib/auth/invitations";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const MAX_LABEL_LEN = 80;

// Trimmed copy of the host-resolution logic in
// /api/account/invitations/route.ts (not exported from there to
// avoid coupling two independent invite flows to one shared helper
// for a one-line difference in the URL path). See that file for the
// full reasoning on the fallback chain and ALLOWED_INVITE_HOSTS.
function getBaseUrl(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const allowList = process.env.ALLOWED_INVITE_HOSTS?.trim()
    ?.split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost && (!allowList?.length || allowList.includes(forwardedHost.toLowerCase()))) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  const host = request.headers.get("host")?.trim();
  if (host && (!allowList?.length || allowList.includes(host.toLowerCase()))) {
    const reqProto = new URL(request.url).protocol.replace(":", "");
    return `${reqProto}://${host}`;
  }

  console.warn(
    "[POST /api/account/collaborators/invitations] could not derive base URL from request; falling back to marketing domain",
  );
  return "https://med.zentrolabs.com";
}

export async function GET() {
  try {
    const ctx = await requireRole("admin");

    const { data, error } = await ctx.supabase
      .from("collaborator_invitations")
      .select("id, label, created_by_user_id, created_at, expires_at, accepted_at, accepted_by_user_id")
      .eq("host_account_id", ctx.accountId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/account/collaborators/invitations] fetch error:", error);
      return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 });
    }

    return NextResponse.json({ invitations: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(`admin:collabInviteCreate:${ctx.userId}`, RATE_LIMITS.adminAction);
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => ({}));
    const label = typeof body?.label === "string" ? body.label.trim().slice(0, MAX_LABEL_LEN) : null;
    const expiresInDays = typeof body?.expiresInDays === "number" ? body.expiresInDays : undefined;

    const { token, hash } = generateInviteToken();
    const expiresAt = inviteExpiresAt(expiresInDays);

    const { data, error } = await ctx.supabase
      .from("collaborator_invitations")
      .insert({
        host_account_id: ctx.accountId,
        token_hash: hash,
        label,
        created_by_user_id: ctx.userId,
        expires_at: expiresAt.toISOString(),
      })
      .select("id, expires_at")
      .single();

    if (error) {
      console.error("[POST /api/account/collaborators/invitations] insert error:", error);
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
    }

    const baseUrl = getBaseUrl(request);
    return NextResponse.json(
      {
        invitation: data,
        token,
        url: `${baseUrl}/collaborate/${token}`,
      },
      { status: 201 },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
