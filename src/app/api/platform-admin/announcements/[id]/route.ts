import { NextResponse } from "next/server";

import { requirePlatformAdmin, logPlatformAdminAction } from "@/lib/auth/platform-admin";
import { toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const PATCHABLE_FIELDS = [
  "title", "body", "image_url", "link_url", "link_label",
  "is_active", "starts_at", "ends_at", "sort_order",
] as const;

const BODY_KEY_MAP: Record<string, string> = {
  title: "title",
  body: "body",
  imageUrl: "image_url",
  linkUrl: "link_url",
  linkLabel: "link_label",
  isActive: "is_active",
  startsAt: "starts_at",
  endsAt: "ends_at",
  sortOrder: "sort_order",
};

/** PATCH /api/platform-admin/announcements/[id] — edit or toggle an announcement. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = await params;

    const limit = checkRateLimit(`platformAdmin:updateAnnouncement:${admin.userId}`, RATE_LIMITS.adminAction);
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => ({}));

    const updates: Record<string, unknown> = {};
    for (const [bodyKey, column] of Object.entries(BODY_KEY_MAP)) {
      if (bodyKey in body && (PATCHABLE_FIELDS as readonly string[]).includes(column)) {
        updates[column] = body[bodyKey];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("platform_announcements")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/platform-admin/announcements/:id] update error:", error);
      return NextResponse.json({ error: "Failed to update the announcement" }, { status: 500 });
    }

    await logPlatformAdminAction({
      adminUserId: admin.userId,
      adminEmail: admin.email,
      action: "update_announcement",
      metadata: { id, fields: Object.keys(updates) },
    });

    return NextResponse.json({ announcement: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** DELETE /api/platform-admin/announcements/[id] — permanently remove an announcement. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = await params;

    const db = supabaseAdmin();
    const { error } = await db.from("platform_announcements").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/platform-admin/announcements/:id] delete error:", error);
      return NextResponse.json({ error: "Failed to delete the announcement" }, { status: 500 });
    }

    await logPlatformAdminAction({
      adminUserId: admin.userId,
      adminEmail: admin.email,
      action: "delete_announcement",
      metadata: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
