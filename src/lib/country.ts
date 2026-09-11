// ============================================================
// Account operating country — migration 129's `accounts.country`
// CHECK constraint mirrors this exact set — keep both in sync.
//
// Drives which legal framework, required fields, and document
// templates the clinical-record/prescription features show (NOM-004-
// SSA3-2012 + COFEPRIS for Mexico; Resolución 1995 de 1999 + Decreto
// 2200 de 2005 + MIPRES for Colombia) — see src/lib/clinical/.
// ============================================================

export const ACCOUNT_COUNTRIES = ["mx", "co"] as const;

export type AccountCountry = (typeof ACCOUNT_COUNTRIES)[number];

export const COUNTRY_LABELS: Record<AccountCountry, string> = {
  mx: "México",
  co: "Colombia",
};

export function isAccountCountry(value: unknown): value is AccountCountry {
  return (
    typeof value === "string" &&
    (ACCOUNT_COUNTRIES as readonly string[]).includes(value)
  );
}

/**
 * Suggest a default account country from the phone dial code's ISO
 * already chosen at signup (`COUNTRY_DIAL_CODES`) — a starting point
 * the user must still confirm/can override, never applied silently.
 */
export function accountCountryFromDialIso(iso: string | undefined | null): AccountCountry {
  if (iso === "MX") return "mx";
  if (iso === "CO") return "co";
  return "mx";
}
