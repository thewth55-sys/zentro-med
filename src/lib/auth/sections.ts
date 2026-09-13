// ============================================================
// Section permissions — pure, unit-testable, no I/O.
//
// A tenant-defined "profile" (`account_roles` row, migration 126)
// can narrow a member's access below their base role
// (`agent`/`viewer`) on a per-section basis: `hidden` (nav item
// disappears) or `view_only` (nav item stays, but writes are
// blocked — reads pass through to the normal RLS-enforced role).
//
// Two different enforcement mechanisms share this same
// `section_overrides` storage, depending on how the section's data
// actually flows:
// - Billing/Banking/Inventory/Agenda write through a server API
//   route, so both `hidden` and `view_only` are enforced there via
//   `requireSectionAccess` (API 403s on writes; `hidden` also 403s
//   reads).
// - Patients (`contacts`/`patient_profiles`/clinical tables) writes
//   straight from the browser to Supabase with no API route — a
//   server-side `view_only` check here would be honest for nothing.
//   It's enforced at the RLS level instead (`is_section_hidden()`,
//   migration 140) and only understands `hidden`; `view_only` is
//   accepted here for storage uniformity but has no effect for this
//   section (see the picker in `profiles-tab.tsx`, which hides that
//   option for Patients).
// ============================================================

export type SectionKey = "billing" | "banking" | "inventory" | "agenda" | "patients";

export const SECTION_KEYS: readonly SectionKey[] = [
  "billing",
  "banking",
  "inventory",
  "agenda",
  "patients",
] as const;

/** Sections whose enforcement (RLS, not an API route) only understands `hidden` — `view_only` is a no-op. */
export const HIDDEN_ONLY_SECTIONS: readonly SectionKey[] = ["patients"];

export type SectionPermission = "hidden" | "view_only";

/** `Partial<Record<SectionKey, SectionPermission>>` — absent key = inherit the base role's normal access. */
export type SectionOverrides = Partial<Record<SectionKey, SectionPermission>>;

export function isSectionKey(value: unknown): value is SectionKey {
  return (
    typeof value === "string" &&
    (SECTION_KEYS as readonly string[]).includes(value)
  );
}

export function isSectionPermission(value: unknown): value is SectionPermission {
  return value === "hidden" || value === "view_only";
}

/** Type-narrow an unknown jsonb value into `SectionOverrides`, dropping anything malformed. */
export function parseSectionOverrides(value: unknown): SectionOverrides {
  if (!value || typeof value !== "object") return {};
  const result: SectionOverrides = {};
  for (const [key, permission] of Object.entries(value as Record<string, unknown>)) {
    if (isSectionKey(key) && isSectionPermission(permission)) {
      result[key] = permission;
    }
  }
  return result;
}

/** Resolve the override for one section, or `null` if the section is unrestricted. */
export function resolveSectionPermission(
  overrides: SectionOverrides,
  section: SectionKey,
): SectionPermission | null {
  return overrides[section] ?? null;
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}
