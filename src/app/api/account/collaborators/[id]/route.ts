// ============================================================
// PATCH /api/account/collaborators/[id]
//
// Admin+. The only supported action is revoking an active
// collaborator — flips status to 'revoked' (never deletes the row,
// so the history of who had access stays visible). Revocation takes
// effect immediately: `is_account_collaborator()` re-checks
// `status = 'active'` on every RLS evaluation, so there's no
// caching/propagation delay, and `getCurrentAccount` will stop
// honoring that collaborator's acting-account cookie on their very
// next request.
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole("admin");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body?.status !== "revoked") {
      return NextResponse.json({ error: "Only status: 'revoked' is supported" }, { status: 400 });
    }

    const { data, error } = await ctx.supabase
      .from("account_collaborators")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("host_account_id", ctx.accountId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[PATCH /api/account/collaborators/[id]] update error:", error);
      return NextResponse.json({ error: "Failed to revoke collaborator" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
