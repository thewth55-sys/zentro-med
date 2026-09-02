/**
 * Shared, dependency-free condition predicate — originally lived only
 * inside the Flows runner (`src/lib/flows/engine.ts`), extracted here
 * so the public (unauthenticated) intake-form bundle and its admin
 * builder preview can both evaluate "show this field / jump to this
 * page when X is Y" rules without pulling in Flows' WhatsApp/Meta/DB
 * runtime code. `flows/engine.ts` re-exports this same function so
 * every existing import of it from there keeps working unchanged.
 */

export type ConditionOperator = "equals" | "contains" | "present" | "absent";

/**
 * Pure predicate evaluator: no I/O, no knowledge of where
 * `subjectValue` came from (a flow var, a form answer, a contact
 * field — the caller resolves that).
 */
export function evaluateConditionPredicate(args: {
  operator: ConditionOperator;
  /** `undefined` means the subject is absent (no answer/var/tag yet). */
  subjectValue: string | undefined;
  /** The configured comparison value, when applicable. */
  configValue: string | undefined;
}): boolean {
  switch (args.operator) {
    case "present":
      return args.subjectValue !== undefined && args.subjectValue !== "";
    case "absent":
      return args.subjectValue === undefined || args.subjectValue === "";
    case "equals":
      if (args.subjectValue === undefined) return false;
      return args.subjectValue === (args.configValue ?? "");
    case "contains":
      if (args.subjectValue === undefined) return false;
      return args.subjectValue.includes(args.configValue ?? "");
  }
}
