// ============================================================
// requireSectionAccess — requireRole() plus a profile-scoped
// section check.
//
// Migrating a route is a mechanical one-line swap:
//
//   const ctx = await requireRole("agent");
//   →
//   const ctx = await requireSectionAccess("agent", "billing", request);
//
// Same AccountContext, same try/catch/toErrorResponse pattern as
// every other route already uses. When the caller has no
// `customRoleId` (the overwhelming majority — this is an opt-in
// tenant feature), the extra query is skipped entirely and behavior
// is identical to `requireRole`.
//
// Owner/admin are never restricted by a profile (`account_roles`
// only ever assigns agent/viewer as the base role — see migration
// 126), but the guard checks role-independently of that for
// defense in depth: it only ever narrows via `ctx.customRoleId`,
// which is null for anyone who was never assigned a profile.
// ============================================================

import { requireRole, ForbiddenError, type AccountContext } from "./account";
import type { AccountRole } from "./roles";
import {
  isWriteMethod,
  parseSectionOverrides,
  resolveSectionPermission,
  type SectionKey,
} from "./sections";

const COLLABORATOR_FORBIDDEN_SECTIONS: readonly SectionKey[] = ["billing", "banking", "inventory"];

export async function requireSectionAccess(
  min: AccountRole,
  section: SectionKey,
  request: Request,
  options?: { allowSuspended?: boolean },
): Promise<AccountContext> {
  const ctx = await requireRole(min, options);

  // External collaborators (137_account_collaborators.sql) never get
  // Billing/Banking/Inventory, full stop — RLS already denies them
  // access to those tables outright (no is_account_collaborator()
  // branch was added to those policies), but that would otherwise
  // surface as a confusing empty result or a generic query error.
  // This turns it into an explicit, clean 403. "agenda" isn't listed
  // here — collaborators are meant to use it, and they never have a
  // customRoleId to be narrowed by below anyway.
  if (ctx.isCollaborator && COLLABORATOR_FORBIDDEN_SECTIONS.includes(section)) {
    throw new ForbiddenError("Collaborators don't have access to this section");
  }

  if (!ctx.customRoleId) return ctx;

  const { data, error } = await ctx.supabase
    .from("account_roles")
    .select("section_overrides")
    .eq("id", ctx.customRoleId)
    .maybeSingle();

  // Profile was deleted out from under an already-assigned member —
  // `custom_role_id` falls back to NULL on delete (ON DELETE SET
  // NULL), but a stale read could still race it; fail open to "no
  // restriction" rather than locking the member out entirely.
  if (error || !data) return ctx;

  const overrides = parseSectionOverrides(data.section_overrides);
  const permission = resolveSectionPermission(overrides, section);

  if (permission === "hidden") {
    throw new ForbiddenError("You don't have access to this section");
  }
  if (permission === "view_only" && isWriteMethod(request.method)) {
    throw new ForbiddenError("Your profile has read-only access to this section");
  }

  return ctx;
}
