// ============================================================
// Section permissions — pure, unit-testable, no I/O.
//
// A tenant-defined "profile" (`account_roles` row, migration 126)
// can narrow a member's access below their base role
// (`agent`/`viewer`) on a per-section basis: `hidden` (nav item
// disappears, API 403s on any method) or `view_only` (nav item
// stays, but write methods 403 — reads pass through to the normal
// RLS-enforced role).
//
// Scoped to the 4 sections whose writes actually flow through a
// server API route today (Billing, Banking, Inventory, Agenda) —
// "Pacientes"/"Prospectos" and everything else write straight from
// the browser to Supabase, so a server-side `view_only` check here
// would be honest for nothing; those stay hidden-only, enforced
// purely by nav suppression, not by this module.
// ============================================================

export type SectionKey = "billing" | "banking" | "inventory" | "agenda";

export const SECTION_KEYS: readonly SectionKey[] = [
  "billing",
  "banking",
  "inventory",
  "agenda",
] as const;

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
