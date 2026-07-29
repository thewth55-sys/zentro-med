import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

const PLATFORMS = ["android", "ios", "web"] as const;

/**
 * POST /api/push/register — upsert this device's FCM token for the
 * signed-in user. Called once the Capacitor app has a token (see
 * push-notifications.ts client wiring) — on first launch and again
 * whenever the OS rotates the token.
 *
 * DELETE /api/push/register — unregister a token (e.g. on logout),
 * so a stale device stops receiving pushes for an account it's no
 * longer signed into.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole("viewer");
    const body = await request.json().catch(() => ({}));

    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const platform = PLATFORMS.includes(body?.platform) ? body.platform : "android";

    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_tokens")
      .upsert(
        { account_id: accountId, user_id: userId, token, platform },
        { onConflict: "user_id,token" }
      );

    if (error) {
      console.error("[push/register POST] upsert error:", error);
      return NextResponse.json({ error: "Failed to register push token" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, userId } = await requireRole("viewer");
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const { error } = await supabase.from("push_tokens").delete().eq("user_id", userId).eq("token", token);

    if (error) {
      console.error("[push/register DELETE] delete error:", error);
      return NextResponse.json({ error: "Failed to unregister push token" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
