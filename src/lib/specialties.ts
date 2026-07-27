// ============================================================
// Fixed list of clinic specialties (migration 076's accounts.specialty
// CHECK constraint mirrors this exact set — keep both in sync). Only
// 'odontologia' has behavioral effect today: it gates whether the
// Odontograma tab shows on a contact (see contact-detail-view.tsx).
// Everything else is informational for now.
// ============================================================

export const DENTAL_SPECIALTY = "odontologia" as const;

export const ACCOUNT_SPECIALTIES = [
  "odontologia",
  "medicina_general",
  "dermatologia",
  "fisioterapia",
  "nutricion",
  "psicologia",
  "otro",
] as const;

export type AccountSpecialty = (typeof ACCOUNT_SPECIALTIES)[number];

export const SPECIALTY_LABELS: Record<AccountSpecialty, string> = {
  odontologia: "Odontología",
  medicina_general: "Medicina general",
  dermatologia: "Dermatología",
  fisioterapia: "Fisioterapia",
  nutricion: "Nutrición",
  psicologia: "Psicología",
  otro: "Otra",
};

/** Existing accounts default to 'odontologia' (migration 076) — this
 *  product's odontogram predates the specialty field, so treat a
 *  missing/unset value the same way rather than hiding a feature
 *  accounts were already using. */
export function showsOdontogram(specialty: string | null | undefined): boolean {
  return !specialty || specialty === DENTAL_SPECIALTY;
}
