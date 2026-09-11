// ============================================================
// /api/account/roles — tenant-defined "profiles" (account_roles).
//
//   GET  — list the account's profiles. Any member can read (the
//          invite dialog and a member's own permission resolution
//          both need this) — RLS on account_roles already scopes
//          SELECT to `is_account_member`.
//   POST — create a new profile. Admin+.
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { parseSectionOverrides } from "@/lib/auth/sections";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const MAX_NAME_LEN = 60;
const BASE_ROLES = ["agent", "viewer"] as const;

export async function GET() {
  try {
    const ctx = await requireRole("viewer");

    const { data, error } = await ctx.supabase
      .from("account_roles")
      .select("id, name, base_role, section_overrides, created_at, updated_at")
      .eq("account_id", ctx.accountId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/account/roles] fetch error:", error);
      return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
    }

    return NextResponse.json({ roles: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(`admin:roleCreate:${ctx.userId}`, RATE_LIMITS.adminAction);
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as
      | { name?: unknown; baseRole?: unknown; sectionOverrides?: unknown }
      | null;

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name || name.length > MAX_NAME_LEN) {
      return NextResponse.json(
        { error: `'name' is required (max ${MAX_NAME_LEN} characters)` },
        { status: 400 },
      );
    }

    const baseRole = body?.baseRole;
    if (typeof baseRole !== "string" || !(BASE_ROLES as readonly string[]).includes(baseRole)) {
      return NextResponse.json(
        { error: "'baseRole' must be 'agent' or 'viewer'" },
        { status: 400 },
      );
    }

    const sectionOverrides = parseSectionOverrides(body?.sectionOverrides);

    const { data, error } = await ctx.supabase
      .from("account_roles")
      .insert({
        account_id: ctx.accountId,
        name,
        base_role: baseRole,
        section_overrides: sectionOverrides,
        created_by_user_id: ctx.userId,
      })
      .select("id, name, base_role, section_overrides, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A profile with this name already exists" },
          { status: 409 },
        );
      }
      console.error("[POST /api/account/roles] insert error:", error);
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }

    return NextResponse.json({ role: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
