import { NextResponse } from "next/server";

import { requireRole, toErrorResponse, ACTING_ACCOUNT_COOKIE } from "@/lib/auth/account";

/**
 * Switches (or clears) which account the caller is currently acting
 * as, for the external-collaborator feature (137_account_collaborators.sql).
 *
 * Sets/clears a cookie naming the target account — `getCurrentAccount`
 * re-validates it against `account_collaborators` on every request, so
 * this route itself only needs to check the grant once, to give the
 * caller an immediate, honest error instead of a cookie that silently
 * does nothing.
 */

/**
 * Echoes back the server-resolved "which account is active right
 * now" — the cookie is httpOnly, so the browser can't read it
 * directly; `useAuth()` calls this once on load (and after switching)
 * to learn `accountId`/`isCollaborator` without duplicating the
 * cookie-validation logic client-side.
 */
export async function GET() {
  try {
    const ctx = await requireRole("viewer");
    return NextResponse.json({
      accountId: ctx.accountId,
      isCollaborator: ctx.isCollaborator,
      homeAccountId: ctx.homeAccountId,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("viewer");
    const body = await request.json().catch(() => ({}));
    const hostAccountId = body?.hostAccountId ?? null;

    const response = NextResponse.json({ success: true });

    if (hostAccountId === null) {
      response.cookies.set(ACTING_ACCOUNT_COOKIE, "", { path: "/", maxAge: 0 });
      return response;
    }

    if (typeof hostAccountId !== "string") {
      return NextResponse.json({ error: "hostAccountId must be a string or null" }, { status: 400 });
    }

    const { data: grant } = await ctx.supabase
      .from("account_collaborators")
      .select("host_account_id")
      .eq("host_account_id", hostAccountId)
      .eq("collaborator_user_id", ctx.userId)
      .eq("status", "active")
      .maybeSingle();

    if (!grant) {
      return NextResponse.json({ error: "No active collaboration for that account" }, { status: 403 });
    }

    response.cookies.set(ACTING_ACCOUNT_COOKIE, hostAccountId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (err) {
    return toErrorResponse(err);
  }
}
