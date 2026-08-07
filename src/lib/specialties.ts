// ============================================================
// Clinic specialties list — migration 086's accounts.specialty CHECK
// constraint mirrors this exact set — keep both in sync. Broad
// medical + allied-health catalog (not dental-only) since the product
// serves any kind of clinic; only 'odontologia' has behavioral effect
// today, gating whether the Odontograma tab shows on a contact (see
// contact-detail-view.tsx). Everything else is informational.
// ============================================================

export const DENTAL_SPECIALTY = "odontologia" as const;

export const ACCOUNT_SPECIALTIES = [
  "odontologia",
  "medicina_general",
  "medicina_familiar",
  "medicina_interna",
  "medicina_urgencias",
  "pediatria",
  "ginecologia_obstetricia",
  "cardiologia",
  "dermatologia",
  "oftalmologia",
  "otorrinolaringologia",
  "traumatologia_ortopedia",
  "neurologia",
  "neurocirugia",
  "psiquiatria",
  "endocrinologia",
  "gastroenterologia",
  "urologia",
  "oncologia",
  "hematologia",
  "anestesiologia",
  "radiologia_imagenologia",
  "cirugia_general",
  "cirugia_plastica",
  "reumatologia",
  "neumologia",
  "alergologia",
  "geriatria",
  "medicina_deportiva",
  "medicina_estetica",
  "nefrologia",
  "infectologia",
  "genetica_medica",
  "patologia",
  "medicina_del_trabajo",
  "fisioterapia",
  "nutricion",
  "psicologia",
  "quiropractica",
  "terapia_ocupacional",
  "optometria",
  "podologia",
  "fonoaudiologia",
  "acupuntura",
  "enfermeria",
  "veterinaria",
  "otro",
] as const;

export type AccountSpecialty = (typeof ACCOUNT_SPECIALTIES)[number];

export const SPECIALTY_LABELS: Record<AccountSpecialty, string> = {
  odontologia: "Odontología",
  medicina_general: "Medicina general",
  medicina_familiar: "Medicina familiar",
  medicina_interna: "Medicina interna",
  medicina_urgencias: "Medicina de urgencias",
  pediatria: "Pediatría",
  ginecologia_obstetricia: "Ginecología y obstetricia",
  cardiologia: "Cardiología",
  dermatologia: "Dermatología",
  oftalmologia: "Oftalmología",
  otorrinolaringologia: "Otorrinolaringología",
  traumatologia_ortopedia: "Traumatología y ortopedia",
  neurologia: "Neurología",
  neurocirugia: "Neurocirugía",
  psiquiatria: "Psiquiatría",
  endocrinologia: "Endocrinología",
  gastroenterologia: "Gastroenterología",
  urologia: "Urología",
  oncologia: "Oncología",
  hematologia: "Hematología",
  anestesiologia: "Anestesiología",
  radiologia_imagenologia: "Radiología e imagenología",
  cirugia_general: "Cirugía general",
  cirugia_plastica: "Cirugía plástica y estética",
  reumatologia: "Reumatología",
  neumologia: "Neumología",
  alergologia: "Alergología e inmunología",
  geriatria: "Geriatría",
  medicina_deportiva: "Medicina del deporte",
  medicina_estetica: "Medicina estética",
  nefrologia: "Nefrología",
  infectologia: "Infectología",
  genetica_medica: "Genética médica",
  patologia: "Patología",
  medicina_del_trabajo: "Medicina del trabajo",
  fisioterapia: "Fisioterapia",
  nutricion: "Nutrición",
  psicologia: "Psicología",
  quiropractica: "Quiropráctica",
  terapia_ocupacional: "Terapia ocupacional",
  optometria: "Optometría",
  podologia: "Podología",
  fonoaudiologia: "Fonoaudiología / terapia del lenguaje",
  acupuntura: "Acupuntura y medicina alternativa",
  enfermeria: "Enfermería",
  veterinaria: "Veterinaria",
  otro: "Otra",
};

/** Existing accounts default to 'odontologia' (migration 076) — this
 *  product's odontogram predates the specialty field, so treat a
 *  missing/unset value the same way rather than hiding a feature
 *  accounts were already using. */
export function showsOdontogram(specialty: string | null | undefined): boolean {
  return !specialty || specialty === DENTAL_SPECIALTY;
}
