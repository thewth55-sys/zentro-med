"use client";

import { useAuth } from "@/hooks/use-auth";
import { planHasFeature, type GatedFeature } from "@/lib/billing-platform/features";

/**
 * Whether the current account's plan includes a given in-app-gated
 * feature (see features.ts). Returns `true` while auth is still
 * loading, same fail-open behavior as `useHasAccess`, so the UI
 * doesn't flash a locked state before the real plan arrives.
 */
export function useHasFeature(feature: GatedFeature): boolean {
  const { profileLoading, account } = useAuth();
  if (profileLoading || !account) return true;
  return planHasFeature(account.plan, feature);
}
