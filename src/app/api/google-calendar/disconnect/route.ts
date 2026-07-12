import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/google-calendar/disconnect — clears the doctor's stored
 * tokens. Does NOT revoke the grant on Google's side (Google keeps
 * showing Zentro Med under the doctor's "Third-party access" until
 * they revoke it there themselves) — deleting our copy of the
 * refresh token is what actually stops future sync calls, which is
 * the part that matters for this app.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("doctors")
    .update({
      google_calendar_connected: false,
      google_calendar_id: null,
      google_refresh_token: null,
      google_calendar_connected_at: null,
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("[google-calendar disconnect] update error:", error);
    return NextResponse.json({ error: "No se pudo desconectar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
