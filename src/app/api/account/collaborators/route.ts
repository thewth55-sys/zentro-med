// ============================================================
// GET /api/account/collaborators
//
// Admin+. Lists the account's active + revoked external
// collaborators (137_account_collaborators.sql) — the "Colaboradores"
// section of Settings reads this to render who has scoped access to
// this account and let an admin revoke it.
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

export async function GET() {
  try {
    const ctx = await requireRole("admin");

    const { data, error } = await ctx.supabase
      .from("account_collaborators")
      .select("id, collaborator_user_id, status, label, created_at, revoked_at")
      .eq("host_account_id", ctx.accountId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/account/collaborators] fetch error:", error);
      return NextResponse.json({ error: "Failed to load collaborators" }, { status: 500 });
    }

    return NextResponse.json({ collaborators: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}
