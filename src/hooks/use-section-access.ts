"use client";

import { useAuth } from "@/hooks/use-auth";
import { resolveSectionPermission, type SectionKey, type SectionPermission } from "@/lib/auth/sections";

/**
 * Resolve the current user's permission for one section, or `null`
 * when unrestricted (no profile assigned, or the profile doesn't
 * override this section). Mirrors `resolveSectionPermission` on the
 * server (`@/lib/auth/section-access`) so nav-hiding and page
 * self-limiting agree with what the API actually enforces.
 */
export function useSectionAccess(section: SectionKey): SectionPermission | null {
  const { sectionOverrides } = useAuth();
  return resolveSectionPermission(sectionOverrides, section);
}

/** Convenience wrapper for nav items — true only when the section should disappear entirely. */
export function useIsSectionHidden(section: SectionKey): boolean {
  return useSectionAccess(section) === "hidden";
}
