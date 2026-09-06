"use client";

import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/use-auth";
import { isPostHogEnabled, posthog } from "@/lib/analytics/posthog";

/**
 * Headless — ties the current signed-in user to PostHog once the
 * profile row resolves (gated on `profileLoading`, per useAuth's own
 * doc comment, so this never fires with a null account_id during the
 * loading window). Real name/email are sent deliberately (product
 * decision, not the safer default) so usage can be read directly in
 * PostHog without cross-referencing this app's own DB — patient data
 * is never part of this payload, only the staff member's own account.
 *
 * `identifiedRef` stops this from re-identifying on every render —
 * only fires again if the actual signed-in user changes.
 */
export function PostHogIdentify() {
  const { user, profile, profileLoading, accountId, accountRole, account } = useAuth();
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isPostHogEnabled) return;
    if (profileLoading || !user || !profile || !accountId) return;
    if (identifiedRef.current === user.id) return;
    identifiedRef.current = user.id;

    posthog.identify(user.id, {
      email: profile.email,
      name: profile.full_name,
      account_id: accountId,
      account_role: accountRole,
    });

    if (account) {
      posthog.group("account", accountId, {
        name: account.name,
        plan: account.plan,
        subscription_status: account.subscription_status,
      });
    }
  }, [user, profile, profileLoading, accountId, accountRole, account]);

  return null;
}
