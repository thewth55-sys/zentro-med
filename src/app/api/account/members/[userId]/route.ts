// ============================================================
// /api/account/members/[userId]
//
//   PATCH  — change a member's role.   Admin+.
//   DELETE — remove a member.          Admin+.
//
// Both delegate to SECURITY DEFINER RPCs from migration 018/127:
//   - set_member_role(p_user_id, p_new_role, p_custom_role_id?)
//   - remove_account_member(p_user_id)
//
// The RPCs do the *real* authorisation work — caller must be
// admin+, target must be in caller's account, target can't be the
// owner, can't be self. The TS layer here only forwards the call
// and maps Postgres SQLSTATEs back to HTTP statuses.
// ============================================================

import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { isAccountRole } from "@/lib/auth/roles";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// Map known SQLSTATEs from the RPCs (see migration 018) onto HTTP
// statuses. The `error.code` field is the SQLSTATE; the `message`
// is the human-readable RAISE message we put in the migration.
function rpcErrorToResponse(err: PostgrestError): NextResponse {
  if (err.code === "42501") {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err.code === "22023") {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error("[members route] unexpected RPC error:", err);
  return NextResponse.json(
    { error: "Failed to update member" },
    { status: 500 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:memberRole:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { userId } = await params;

    const body = (await request.json().catch(() => null)) as
      | { role?: unknown; customRoleId?: unknown }
      | null;
    const role = body?.role;

    if (!isAccountRole(role)) {
      return NextResponse.json(
        { error: "'role' must be one of owner, admin, agent, viewer" },
        { status: 400 },
      );
    }

    // The RPC blocks promotion to / demotion from owner, but
    // surface the friendlier 400 before crossing the wire too.
    if (role === "owner") {
      return NextResponse.json(
        {
          error:
            "Use POST /api/account/transfer-ownership to promote a member to owner",
        },
        { status: 400 },
      );
    }

    // The RPC always overwrites custom_role_id with whatever it's
    // given (see migration 127) — there's no "leave unchanged"
    // signal at that layer. So when the request body doesn't mention
    // `customRoleId` at all (the plain 3-role dropdown in the
    // Members tab doesn't touch profiles), look up the member's
    // current value and pass it straight back through, rather than
    // silently clearing a profile assignment as a side effect of an
    // unrelated role change. `customRoleId: null` explicitly clears
    // it (used by the profile-aware picker).
    let customRoleId: string | null;
    if (body && "customRoleId" in body) {
      customRoleId = typeof body.customRoleId === "string" ? body.customRoleId : null;
    } else {
      const { data: currentProfile } = await ctx.supabase
        .from("profiles")
        .select("custom_role_id")
        .eq("user_id", userId)
        .maybeSingle();
      customRoleId = currentProfile?.custom_role_id ?? null;

      // A profile's base_role is fixed — if this role change moves
      // the member off the base role their current profile assumes
      // (e.g. agent → viewer), the profile no longer applies. Drop
      // it here rather than let the RPC reject the whole role change
      // with a confusing "profile base role mismatch" error.
      if (customRoleId) {
        const { data: currentAccountRole } = await ctx.supabase
          .from("account_roles")
          .select("base_role")
          .eq("id", customRoleId)
          .maybeSingle();
        if (currentAccountRole && currentAccountRole.base_role !== role) {
          customRoleId = null;
        }
      }
    }

    const { error } = await ctx.supabase.rpc("set_member_role", {
      p_user_id: userId,
      p_new_role: role,
      p_custom_role_id: customRoleId,
    });

    if (error) return rpcErrorToResponse(error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:memberRemove:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { userId } = await params;

    const { data, error } = await ctx.supabase.rpc("remove_account_member", {
      p_user_id: userId,
    });

    if (error) return rpcErrorToResponse(error);

    return NextResponse.json({ ok: true, newPersonalAccountId: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
