/**
 * In-app feature gates that vary by plan (as opposed to
 * `hasActiveAccess` in plans.ts, which is the binary "is this account
 * locked out entirely" check).
 *
 * Deliberately narrow: only features with an actual in-app screen are
 * listed here. Most other agency-delivered line items from the
 * /pricing checklist (Meta/Google Ads management, monthly content,
 * account manager, strategy sessions) have no in-app surface to gate
 * — those are fulfilled outside this codebase. "Landing de
 * especialidad" is the one exception with two delivery modes: a
 * self-serve basic builder gated here (`landing_builder`), and a
 * premium version built by Zentro's internal design team from the
 * platform-admin editor (staff-only, gated by requirePlatformAdmin()
 * rather than a plan check — see puck-config.tsx).
 */

import type { Plan } from "./plans";

export type GatedFeature =
  | "automations"
  | "ai_autoreply"
  | "whatsapp_inbox"
  | "broadcasts"
  | "landing_builder";

export const GATED_FEATURES: GatedFeature[] = [
  "automations",
  "ai_autoreply",
  "whatsapp_inbox",
  "broadcasts",
  "landing_builder",
];

export const FEATURE_LABEL: Record<GatedFeature, string> = {
  automations: "Automatizaciones y Flows",
  ai_autoreply: "WhatsApp IA",
  whatsapp_inbox: "Bandeja de WhatsApp",
  broadcasts: "Difusiones",
  landing_builder: "Constructor de landing",
};

/** `accounts.feature_overrides` — absent key falls back to the plan default. */
export type FeatureOverrides = Partial<Record<GatedFeature, boolean>>;

const FEATURE_MIN_PLAN: Record<GatedFeature, Plan[]> = {
  // Landing page's Esencial card explicitly X's out "Automatizaciones
  // y campañas de difusión" — customizable automations only start at
  // Profesional ("Automatizaciones personalizables" is a Profesional
  // pf-new line item).
  automations: ["profesional", "clinica"],
  // Esencial's AI is draft-only (a human reviews/sends every reply —
  // see PLAN_CONFIG.esencial.aiAutonomous) which isn't really
  // "auto-reply" at all; autonomous 24/7 AI with handoff is the
  // Profesional/Clinica line item this gate actually protects.
  ai_autoreply: ["profesional", "clinica"],
  // Esencial's own card lists "Bandeja de WhatsApp (Cloud API)" as
  // included — all three paid plans get the WhatsApp channel itself,
  // only the automation/broadcast/AI layers on top of it are tiered.
  whatsapp_inbox: ["esencial", "profesional", "clinica"],
  // Same X'd-out line as automations on the Esencial card —
  // "Campañas de difusión por WhatsApp" is a Profesional pf-new item.
  broadcasts: ["profesional", "clinica"],
  // "Mini-sitio propio del consultorio" is a Profesional-only pf-new
  // line item — not on Esencial's feature list.
  landing_builder: ["profesional", "clinica"],
};

export function planHasFeature(plan: Plan, feature: GatedFeature): boolean {
  return FEATURE_MIN_PLAN[feature].includes(plan);
}

/**
 * Plan default, unless a platform admin explicitly overrode this
 * feature for the account (see 057_account_feature_overrides.sql) —
 * an override always wins, in either direction.
 */
export function resolveFeatureAccess(
  plan: Plan,
  feature: GatedFeature,
  overrides: FeatureOverrides | null | undefined,
): boolean {
  const override = overrides?.[feature];
  if (override !== undefined) return override;
  return planHasFeature(plan, feature);
}
