// ============================================================
// /api/account/roles/[id] — edit / delete one profile. Admin+.
//
// Deleting a profile does NOT remove the members holding it — the
// FK is `ON DELETE SET NULL` (migration 126), so they fall back to
// their plain base role, never left in a broken state.
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { parseSectionOverrides } from "@/lib/auth/sections";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const MAX_NAME_LEN = 60;
const BASE_ROLES = ["agent", "viewer"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole("admin");
    const { id } = await params;

    const limit = checkRateLimit(`admin:roleEdit:${ctx.userId}`, RATE_LIMITS.adminAction);
    if (!limit.success) return rateLimitResponse(limit);

    const { data: existing } = await ctx.supabase
      .from("account_roles")
      .select("account_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing || existing.account_id !== ctx.accountId) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as
      | { name?: unknown; baseRole?: unknown; sectionOverrides?: unknown }
      | null;

    const update: Record<string, unknown> = {};

    if (body?.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > MAX_NAME_LEN) {
        return NextResponse.json(
          { error: `'name' must be 1-${MAX_NAME_LEN} characters` },
          { status: 400 },
        );
      }
      update.name = name;
    }

    if (body?.baseRole !== undefined) {
      if (typeof body.baseRole !== "string" || !(BASE_ROLES as readonly string[]).includes(body.baseRole)) {
        return NextResponse.json(
          { error: "'baseRole' must be 'agent' or 'viewer'" },
          { status: 400 },
        );
      }
      update.base_role = body.baseRole;
    }

    if (body?.sectionOverrides !== undefined) {
      update.section_overrides = parseSectionOverrides(body.sectionOverrides);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const { data, error } = await ctx.supabase
      .from("account_roles")
      .update(update)
      .eq("id", id)
      .select("id, name, base_role, section_overrides, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A profile with this name already exists" },
          { status: 409 },
        );
      }
      console.error("[PATCH /api/account/roles/[id]] update error:", error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ role: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole("admin");
    const { id } = await params;

    const { data: existing } = await ctx.supabase
      .from("account_roles")
      .select("account_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing || existing.account_id !== ctx.accountId) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { error } = await ctx.supabase.from("account_roles").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/account/roles/[id]] delete error:", error);
      return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
