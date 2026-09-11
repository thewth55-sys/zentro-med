// ============================================================
// Historia clínica — section/field definitions per account country.
//
// This is the normative shape of the intake document (NOM-004-SSA3-2012
// for Mexico, Resolución 1995 de 1999 for Colombia) — a hardcoded,
// versioned TS config, deliberately NOT stored in the database or
// editable by a tenant (see 130_clinical_history.sql's header comment
// for why). Actual patient answers live in
// `clinical_history_records.sections`, keyed by `section.key` →
// `field.key`.
//
// Field labels/required flags are taken directly from the approved
// mockup (Expediente Clínico standalone.html, `secciones` in its
// DCLogic script) — this file is the single source of truth for both
// rendering the form and computing "% completado" / "falta por
// llenar".
// ============================================================

import type { AccountCountry } from "@/lib/country";

export type HistorySectionKey =
  | "identification"
  | "background"
  | "current_illness"
  | "examination"
  | "diagnosis_plan";

export interface HistoryField {
  key: string;
  /** Default label; overridden per-country via `labelByCountry` when the mockup uses a different term. */
  label: string;
  labelByCountry?: Partial<Record<AccountCountry, string>>;
  required: boolean;
  requiredByCountry?: Partial<Record<AccountCountry, boolean>>;
  /** Grid column span, matching the mockup's 3-column section grid (1 = default). */
  span?: 1 | 2 | 3;
  multiline?: boolean;
  /** Set on the one pseudo-field the UI renders from live odontogram data instead of a text input. */
  derived?: "odontogram_summary";
}

export interface HistorySection {
  key: HistorySectionKey;
  title: string;
  /** Short "why this section is required" meta line — varies by country's citation. */
  metaByCountry: Record<AccountCountry, string>;
  fields: HistoryField[];
}

export function fieldLabel(field: HistoryField, country: AccountCountry): string {
  return field.labelByCountry?.[country] ?? field.label;
}

export function fieldRequired(field: HistoryField, country: AccountCountry): boolean {
  return field.requiredByCountry?.[country] ?? field.required;
}

export const HISTORY_SECTIONS: HistorySection[] = [
  {
    key: "identification",
    title: "Ficha de identificación",
    metaByCountry: {
      mx: "Obligatoria · NOM-004 numeral 5.1",
      co: "Obligatoria · identificación del usuario",
    },
    fields: [
      { key: "full_name", label: "Nombre completo", required: true, span: 2 },
      { key: "birth_date", label: "Fecha de nacimiento", required: true },
      { key: "sex", label: "Sexo", required: true },
      {
        key: "id_document",
        label: "Documento de identidad",
        labelByCountry: { mx: "CURP" },
        required: true,
      },
      { key: "birth_place", label: "Lugar de nacimiento", required: false },
      { key: "address", label: "Domicilio", required: false, span: 2 },
      { key: "phone", label: "Teléfono", required: true },
      { key: "occupation", label: "Ocupación", required: false },
      {
        key: "coverage",
        label: "Derechohabiencia",
        labelByCountry: { co: "EPS / aseguradora" },
        required: false,
        requiredByCountry: { co: true },
      },
      { key: "emergency_contact", label: "Contacto de emergencia", required: false, span: 2 },
    ],
  },
  {
    key: "background",
    title: "Antecedentes heredofamiliares y personales",
    metaByCountry: {
      mx: "Patológicos y no patológicos",
      co: "Patológicos y no patológicos",
    },
    fields: [
      { key: "conditions", label: "Condiciones registradas", required: false, span: 3, multiline: true },
      { key: "current_medications", label: "Medicación actual", required: false, span: 2 },
      { key: "previous_surgeries", label: "Cirugías previas", required: false },
      { key: "hygiene_habits", label: "Hábitos de higiene", required: false, span: 2 },
      { key: "last_dental_visit", label: "Última visita odontológica", required: false },
    ],
  },
  {
    key: "current_illness",
    title: "Padecimiento actual e interrogatorio",
    metaByCountry: {
      mx: "Motivo de consulta y anamnesis",
      co: "Motivo de consulta y anamnesis",
    },
    fields: [
      { key: "chief_complaint", label: "Motivo de consulta", required: true, span: 3, multiline: true },
      { key: "evolution", label: "Evolución", required: false, span: 3, multiline: true },
      { key: "pain_scale", label: "Intensidad (EVA)", required: false },
      { key: "aggravating_factors", label: "Factores que lo agravan", required: false },
      { key: "prior_treatment", label: "Tratamiento previo", required: false },
    ],
  },
  {
    key: "examination",
    title: "Exploración física y odontológica",
    metaByCountry: {
      mx: "Signos vitales y hallazgos",
      co: "Examen físico y estomatológico",
    },
    fields: [
      { key: "blood_pressure", label: "T/A", required: true },
      { key: "heart_rate", label: "Frecuencia cardiaca", required: true },
      { key: "temperature", label: "Temperatura", required: true },
      { key: "weight", label: "Peso", required: false },
      { key: "height", label: "Talla", required: false },
      { key: "extraoral_exam", label: "Exploración extraoral", required: false },
      { key: "intraoral_exam", label: "Exploración intraoral", required: false, span: 3, multiline: true },
      { key: "odontogram_summary", label: "Odontograma", required: false, derived: "odontogram_summary" },
      { key: "imaging_studies", label: "Estudios de gabinete", required: false, span: 2 },
    ],
  },
  {
    key: "diagnosis_plan",
    title: "Diagnóstico y plan de tratamiento",
    metaByCountry: {
      mx: "Diagnóstico y pronóstico",
      co: "Impresión diagnóstica con código CIE-10",
    },
    fields: [
      {
        key: "diagnosis",
        label: "Diagnóstico",
        labelByCountry: { co: "Diagnóstico principal (CIE-10)" },
        required: true,
        span: 2,
      },
      { key: "prognosis", label: "Pronóstico", required: true },
      { key: "treatment_plan", label: "Plan de tratamiento", required: true, span: 3, multiline: true },
      { key: "informed_consent", label: "Consentimiento informado", required: false, span: 2 },
      { key: "linked_budget", label: "Presupuesto ligado", required: false },
    ],
  },
];

export function getRequiredFields(country: AccountCountry): { section: HistorySection; field: HistoryField }[] {
  return HISTORY_SECTIONS.flatMap((section) =>
    section.fields
      .filter((field) => fieldRequired(field, country) && !field.derived)
      .map((field) => ({ section, field })),
  );
}

/**
 * `sections` shape: `Record<HistorySectionKey, Record<string, string>>`.
 * A field counts as filled when it has a non-empty trimmed value.
 */
export function computeCompletion(
  sections: Record<string, Record<string, string>>,
  country: AccountCountry,
): { percent: number; missing: { section: HistorySection; field: HistoryField }[] } {
  const required = getRequiredFields(country);
  if (required.length === 0) return { percent: 100, missing: [] };

  const missing = required.filter(({ section, field }) => {
    const value = sections[section.key]?.[field.key];
    return !value || value.trim() === "";
  });

  const percent = Math.round(((required.length - missing.length) / required.length) * 100);
  return { percent, missing };
}
