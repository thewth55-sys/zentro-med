import { NextResponse } from "next/server";
import { requireStaffRole, resolveAccountOwner } from "@/lib/auth/platform-admin";
import { toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { logPlatformAdminAction } from "@/lib/auth/platform-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    const admin = await requireStaffRole(["marketing"]);
    const { accountId } = await params;
    const body = await request.json();
    
    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const owner = await resolveAccountOwner(accountId);
    if (!owner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 404 });
    }

    const key = `platformAdmin:marketingAddon:${admin.userId}`;
    const limit = await checkRateLimit(key, RATE_LIMITS.adminAction);
    if (!limit.success) {
      return rateLimitResponse(limit);
    }

    const { error } = await supabaseAdmin().from("accounts").update({ marketing_addon: body.enabled }).eq("id", accountId);
    if (error) {
      console.error("[PATCH /api/platform-admin/accounts/[accountId]/marketing-addon] error:", error);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    logPlatformAdminAction({
      adminUserId: admin.userId,
      adminEmail: admin.email,
      action: "set_marketing_addon",
      targetAccountId: accountId,
      targetUserId: null,
      metadata: { accountName: owner.accountName, enabled: body.enabled }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}