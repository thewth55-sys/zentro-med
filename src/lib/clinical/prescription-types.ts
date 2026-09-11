// ============================================================
// Receta / prescription — country-conditional type list, folio
// doc_type, document title, and legal citation text. Hardcoded
// normative config (not tenant-editable), same reasoning as
// history-sections.ts — mirrors the approved Receta PDF mockup.
// ============================================================

import type { AccountCountry } from "@/lib/country";

export interface PrescriptionTypeOption {
  value: string;
  label: string;
  meta: string;
}

const PRESCRIPTION_TYPES_MX: PrescriptionTypeOption[] = [
  { value: "simple", label: "Receta simple", meta: "Medicamentos de venta libre y de los grupos IV a VI" },
  { value: "antibiotico", label: "Receta de antibiótico", meta: "Requiere retención de copia en farmacia" },
  { value: "especial", label: "Receta especial", meta: "Grupo I y II · con código de barras de COFEPRIS" },
];

const PRESCRIPTION_TYPES_CO: PrescriptionTypeOption[] = [
  { value: "simple", label: "Prescripción simple", meta: "Financiada con recursos de la UPC" },
  { value: "mipres", label: "Prescripción MIPRES", meta: "Tecnologías no financiadas con UPC" },
  { value: "control_especial", label: "Control especial", meta: "Monopolio del Estado · formato oficial" },
];

export function getPrescriptionTypes(country: AccountCountry): PrescriptionTypeOption[] {
  return country === "co" ? PRESCRIPTION_TYPES_CO : PRESCRIPTION_TYPES_MX;
}

/** `billing_counters.doc_type` value for this country (132_prescriptions.sql). */
export function prescriptionDocType(country: AccountCountry): "prescription_mx" | "prescription_co" {
  return country === "co" ? "prescription_co" : "prescription_mx";
}

export function prescriptionDocTitle(country: AccountCountry): string {
  return country === "co" ? "Prescripción de medicamentos" : "Receta médica";
}

export function prescriptionNorma(country: AccountCountry): string {
  return country === "co"
    ? "Decreto 2200 de 2005 · Denominación Común Internacional"
    : "Reglamento de Insumos para la Salud, arts. 28–33";
}

export function prescriptionDciLabel(country: AccountCountry): string {
  return country === "co"
    ? "Se prescribe por Denominación Común Internacional"
    : "La denominación genérica es obligatoria; la marca es opcional";
}

export function prescriptionLegalText(country: AccountCountry): string {
  return country === "co"
    ? "PRESCRIPCIÓN EMITIDA CONFORME AL DECRETO 2200 DE 2005, CAPÍTULO IV, Y A LA RESOLUCIÓN 1995 DE 1999 SOBRE HISTORIA CLÍNICA. LA PRESCRIPCIÓN SE REALIZA POR DENOMINACIÓN COMÚN INTERNACIONAL, EN IDIOMA ESPAÑOL Y EN FORMA LEGIBLE, PREVIA EVALUACIÓN DEL PACIENTE Y REGISTRO DEL DIAGNÓSTICO EN SU HISTORIA CLÍNICA. LOS MEDICAMENTOS AQUÍ PRESCRITOS SE ENCUENTRAN FINANCIADOS CON RECURSOS DE LA UPC Y NO REQUIEREN REPORTE EN MIPRES. DOCUMENTO CON FIRMA ELECTRÓNICA Y SELLO DE TIEMPO VERIFICABLE."
    : "RECETA EMITIDA CONFORME AL REGLAMENTO DE INSUMOS PARA LA SALUD, ARTÍCULOS 28 A 33, Y A LA NOM-004-SSA3-2012 DEL EXPEDIENTE CLÍNICO. LA PRESCRIPCIÓN SE REALIZA POR DENOMINACIÓN GENÉRICA; LA DENOMINACIÓN DISTINTIVA ES DE CARÁCTER OPCIONAL Y EL PACIENTE PUEDE SOLICITAR EL GENÉRICO INTERCAMBIABLE. ESTE DOCUMENTO NO AUTORIZA LA DISPENSACIÓN DE MEDICAMENTOS DE LOS GRUPOS I Y II, QUE REQUIEREN RECETA ESPECIAL CON CÓDIGO DE BARRAS EMITIDO POR COFEPRIS. DOCUMENTO CON FIRMA ELECTRÓNICA Y SELLO DE TIEMPO VERIFICABLE.";
}

/**
 * Best-effort, non-blocking allergy check — keyword match against the
 * patient's free-text `allergies` field. Never a hard block (allergy
 * data isn't structured), just a warning the prescriber can override.
 */
export function checkAllergyConflict(medicationName: string, allergiesText: string | null | undefined): boolean {
  if (!medicationName.trim() || !allergiesText?.trim()) return false;
  const needle = medicationName.trim().toLowerCase();
  return allergiesText.toLowerCase().includes(needle);
}
