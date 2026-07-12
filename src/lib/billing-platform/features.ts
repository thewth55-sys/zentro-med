/**
 * In-app feature gates that vary by plan (as opposed to
 * `hasActiveAccess` in plans.ts, which is the binary "is this account
 * locked out entirely" check).
 *
 * Deliberately narrow: only features with an actual in-app screen are
 * listed here. Agency-delivered line items from the /pricing
 * checklist (Meta/Google Ads management, monthly content, landing
 * pages, account manager, strategy sessions) have no in-app surface
 * to gate — those are fulfilled outside this codebase, so there's
 * nothing to hide/blur for them.
 */

import type { Plan } from "./plans";

export type GatedFeature = "automations" | "ai_autoreply";

const FEATURE_MIN_PLAN: Record<GatedFeature, Plan[]> = {
  // "Automatizaciones y flows" — trial doesn't get it per /pricing;
  // every paid plan (standalone included) does.
  automations: ["standalone", "zentro_salud_starter", "zentro_salud_pro"],
  // "WhatsApp IA (requiere plan de pago)" on the trial card.
  ai_autoreply: ["standalone", "zentro_salud_starter", "zentro_salud_pro"],
};

export function planHasFeature(plan: Plan, feature: GatedFeature): boolean {
  return FEATURE_MIN_PLAN[feature].includes(plan);
}
