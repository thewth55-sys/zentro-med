import { evaluateConditionPredicate } from "@/lib/conditions/predicate";
import type { IntakeField, IntakeFormPage } from "./types";

/**
 * Pure page-walking logic shared between the public wizard's
 * client-side renderer (instant per-page feedback) and the server-side
 * validation in the booking route (the real trust boundary — an
 * unauthenticated route can never rely on the client alone). One
 * implementation, two callers, per the plan.
 */

type Answers = Record<string, string>;

export function isFieldVisible(field: IntakeField, answers: Answers): boolean {
  const rule = field.visibility;
  if (!rule) return true;
  return evaluateConditionPredicate({
    operator: rule.operator,
    subjectValue: answers[rule.subjectFieldId],
    configValue: rule.value,
  });
}

export function getVisibleFields(page: IntakeFormPage, answers: Answers): IntakeField[] {
  return page.fields.filter((field) => isFieldVisible(field, answers));
}

/** Ids of currently-visible required fields with no non-empty answer. */
export function getMissingRequiredFieldIds(page: IntakeFormPage, answers: Answers): string[] {
  return getVisibleFields(page, answers)
    .filter((field) => field.required && !answers[field.id]?.trim())
    .map((field) => field.id);
}

/**
 * First matching jump rule wins; no match falls through to the next
 * page in array order. Returns `null` when `page` is the last page
 * (form complete).
 */
export function resolveNextPageId(
  page: IntakeFormPage,
  answers: Answers,
  pages: IntakeFormPage[],
): string | null {
  for (const rule of page.jumpRules) {
    const matched = evaluateConditionPredicate({
      operator: rule.operator,
      subjectValue: answers[rule.subjectFieldId],
      configValue: rule.value,
    });
    if (matched) return rule.targetPageId;
  }
  const index = pages.findIndex((p) => p.id === page.id);
  return index >= 0 && index < pages.length - 1 ? pages[index + 1].id : null;
}
