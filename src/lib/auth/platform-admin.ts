// ============================================================
// Platform-admin context — for the /admin super-admin panel.
//
// Deliberately separate from `account.ts` — `requireRole()` answers
// "does this user have enough privilege INSIDE their own account",
// while this answers "is this user Zentro Med staff, with no
// particular account of their own". A user can be a platform admin
// and simultaneously a plain `viewer` (or nothing at all) in every
// clinic's account — the two are unrelated axes.
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "./account";

export interface PlatformAdminContext {
  userId: string;
  email: string | null;
}

/**
 * Throws `UnauthorizedError` if there's no session, `ForbiddenError`
 * if the caller isn't in `platform_admins`. Use at the top of every
 * `/api/platform-admin/**` route and inside `/admin/**` server
 * components/layouts.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new UnauthorizedError();
  }

  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[requirePlatformAdmin] lookup error:", error);
    throw new ForbiddenError("Could not verify platform admin status");
  }
  if (!data) {
    throw new ForbiddenError("Platform admin access required");
  }

  return { userId: user.id, email: user.email ?? null };
}
