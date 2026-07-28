import { NextResponse } from "next/server";

import { requirePlatformAdmin, logPlatformAdminAction } from "@/lib/auth/platform-admin";
import { toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/platform-admin/announcements — lists every announcement
 * (active and inactive, past and future) for the admin list view.
 *
 * POST /api/platform-admin/announcements — creates a new promo/
 * announcement shown on every account's dashboard once active.
 * body: {
 *   title: string,
 *   body: string,
 *   imageUrl?: string | null,
 *   linkUrl?: string | null,
 *   linkLabel?: string | null,
 *   isActive?: boolean,          // defaults true
 *   startsAt?: string | null,    // ISO date
 *   endsAt?: string | null,      // ISO date
 *   sortOrder?: number,          // defaults 0
 * }
 */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const db = supabaseAdmin();

    const { data, error } = await db
      .from("platform_announcements")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/platform-admin/announcements] load error:", error);
      return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
    }

    return NextResponse.json({ announcements: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePlatformAdmin();

    const limit = checkRateLimit(`platformAdmin:createAnnouncement:${admin.userId}`, RATE_LIMITS.adminAction);
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const text = typeof body?.body === "string" ? body.body.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: row, error } = await db
      .from("platform_announcements")
      .insert({
        title,
        body: text,
        image_url: typeof body?.imageUrl === "string" ? body.imageUrl.trim() || null : null,
        link_url: typeof body?.linkUrl === "string" ? body.linkUrl.trim() || null : null,
        link_label: typeof body?.linkLabel === "string" ? body.linkLabel.trim() || null : null,
        is_active: typeof body?.isActive === "boolean" ? body.isActive : true,
        starts_at: body?.startsAt || null,
        ends_at: body?.endsAt || null,
        sort_order: Number.isFinite(body?.sortOrder) ? body.sortOrder : 0,
        created_by: admin.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/platform-admin/announcements] insert error:", error);
      return NextResponse.json({ error: "Failed to create the announcement" }, { status: 500 });
    }

    await logPlatformAdminAction({
      adminUserId: admin.userId,
      adminEmail: admin.email,
      action: "create_announcement",
      metadata: { title },
    });

    return NextResponse.json({ announcement: row });
  } catch (err) {
    return toErrorResponse(err);
  }
}
