import type { ConditionOperator } from "@/lib/conditions/predicate";

/**
 * Per-doctor patient intake / clinical pre-screening form. Stored
 * whole as `doctors.intake_form_config` (jsonb) — this is a config
 * object the clinic authors, not a live DB-normalized schema, so it's
 * versioned by convention rather than by migration: adding a new
 * field to an interface here is backward compatible as long as it's
 * optional, matching the same posture as `BookingPageConfig`
 * (`src/lib/scheduling/public-booking.ts`).
 */

export type IntakeFieldType =
  | "short_text"
  | "long_text"
  | "date"
  | "number"
  | "phone"
  | "email"
  | "single_choice";

export interface IntakeFieldOption {
  id: string;
  label: string;
}

/** A field is hidden by default when it carries a rule — shown only
 *  once the referenced field's answer satisfies the predicate. No
 *  rule (or `null`) means always visible. */
export interface IntakeVisibilityRule {
  /** id of another field on the SAME page. */
  subjectFieldId: string;
  operator: ConditionOperator;
  /** Option id (single_choice) or literal value. Ignored for present/absent. */
  value?: string;
}

export interface IntakeField {
  id: string;
  type: IntakeFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  /** single_choice only. */
  options?: IntakeFieldOption[];
  visibility?: IntakeVisibilityRule | null;
}

/** Evaluated in array order after a page's fields are answered — first
 *  match wins. No match falls through to the next page in `pages[]`. */
export interface IntakePageJumpRule {
  /** id of a field on THIS page. */
  subjectFieldId: string;
  operator: ConditionOperator;
  value?: string;
  targetPageId: string;
}

export interface IntakeFormPage {
  id: string;
  title: string;
  fields: IntakeField[];
  jumpRules: IntakePageJumpRule[];
}

export interface IntakeFormConfig {
  pages: IntakeFormPage[];
}

/** One denormalized answer as stored in `intake_form_submissions.answers`
 *  — snapshotted at submit time so a later edit to the doctor's live
 *  form config never corrupts or blanks out already-saved history. */
export interface IntakeAnswerRecord {
  page_title: string;
  field_id: string;
  field_label: string;
  field_type: IntakeFieldType;
  value: string;
}

/** True when a form has at least one page with at least one field —
 *  the signal both the public wizard and the builder use to decide
 *  whether "this doctor has an intake form" at all. */
export function hasIntakeFormContent(config: IntakeFormConfig | null | undefined): boolean {
  return !!config?.pages?.some((page) => page.fields.length > 0);
}
