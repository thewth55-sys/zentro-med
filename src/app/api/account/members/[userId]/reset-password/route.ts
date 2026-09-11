import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { roleRank, isAccountRole } from "@/lib/auth/roles";
import { supabaseAdmin } from "@/lib/account/admin-client";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/account/members/[userId]/reset-password — admin+.
 *
 * Same pattern as the platform-admin equivalent
 * (src/app/api/platform-admin/accounts/[accountId]/reset-password/route.ts):
 * triggers Supabase's normal recovery-email flow rather than an
 * admin-side password set, so the caller never sees or handles the
 * new password. Restricted to targets with a strictly lower role
 * than the caller — an admin can reset an agent/viewer, never
 * another admin, the owner, or themselves (self-target is already
 * excluded since roleRank(x) < roleRank(x) is always false).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");
    const { userId } = await params;

    const limit = checkRateLimit(
      `admin:memberResetPassword:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { data: target } = await ctx.supabase
      .from("profiles")
      .select("account_id, account_role, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (!target || target.account_id !== ctx.accountId) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }
    if (!isAccountRole(target.account_role) || roleRank(target.account_role) >= roleRank(ctx.role)) {
      return NextResponse.json(
        { error: "You can only reset the password of a user with a lower role than yours" },
        { status: 403 },
      );
    }
    if (!target.email) {
      return NextResponse.json({ error: "This user has no email on file" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://med.zentrolabs.com";
    const { error } = await supabaseAdmin().auth.resetPasswordForEmail(target.email, {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
