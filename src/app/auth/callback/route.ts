// ============================================================
// GET /auth/callback
//
// Exchanges a Supabase PKCE `code` (password-reset email link, and
// now the platform-admin impersonation magic link) for a real
// session, then redirects to `next`. This route was already assumed
// to exist — forgot-password/page.tsx has pointed
// `resetPasswordForEmail`'s `redirectTo` here since it was written —
// but it was never created, so the reset-password email link has
// been landing on a 404 with no session established. Built now
// because impersonation depends on the exact same exchange.
// ============================================================

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[GET /auth/callback] exchangeCodeForSession failed:", error);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
