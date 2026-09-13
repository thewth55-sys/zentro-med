/**
 * Age in whole years from a birth date, or null when absent/invalid.
 * Shared by the patients list (src/hooks/use-patients-list.ts) and the
 * clinical screens (Historia Clínica, Odontograma) — a QA finding was
 * that age never showed up anywhere in the clinical context despite
 * `patient_profiles.birth_date` already being captured and this exact
 * computation already existing for the patients list.
 */
export function computeAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
