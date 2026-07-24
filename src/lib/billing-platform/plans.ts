/**
 * Single source of truth for what Zentro Med sells and how much it
 * costs — every price/seat number lives here, not scattered across
 * Checkout/webhook/pricing-page code. Adjusting a price is a one-line
 * change to this file, not a hunt through the codebase.
 *
 * Plan names/prices/limits below match the landing page's pricing
 * section exactly (see src/app/landing-content.ts's PRICING block).
 * Renamed from the old standalone/zentro_salud_starter/zentro_salud_pro
 * tiers — same three-tier shape, new names and a repriced middle/top
 * tier ($299/$499 -> $99/$149).
 *
 * IMPORTANT: the Stripe products/prices for esencial/profesional/clinica
 * do not exist yet as of this rename — see the STRIPE_PRICE_* env vars
 * below. Nothing will actually charge correctly until those are created
 * in the Stripe dashboard and the env vars are set.
 */

export type Plan = "trial" | "esencial" | "profesional" | "clinica";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "trial_expired"
  /** Administrative lock set by a platform admin (see /admin) —
   *  distinct from a customer-initiated `canceled`. */
  | "suspended";

export const TRIAL_DAYS = 30;
export const DEFAULT_INCLUDED_SEATS = 2;

export interface PlanDefinition {
  id: Plan;
  /** Flat monthly price in USD. 0 for trial (no card). */
  basePriceUsd: number;
  /** USD per seat beyond includedSeats. null when the plan has no seat billing of its own (trial). */
  seatPriceUsd: number | null;
  includedSeats: number;
  /**
   * Max active contacts ("pacientes activos") this plan allows.
   * null = unlimited. Enforced server-side by a DB trigger — see
   * 049_patient_limit_enforcement.sql / 065_plan_rename_esencial_profesional_clinica.sql
   * — not just here; this constant exists so the UI can show
   * remaining-quota copy, not as the enforcement point itself.
   */
  patientLimit: number | null;
  /**
   * Max AI *responses* (one row per auto-reply/draft call, regardless
   * of token length) this plan allows per calendar month. null =
   * unlimited. Enforced in application code (lib/ai/quota.ts) by
   * counting `ai_usage_log` rows, not summing tokens — the landing
   * page promises response counts, not a token budget, so the
   * enforcement now matches exactly what's sold. Checked BEFORE
   * calling the provider (not after logging usage), since by then the
   * (BYO-key) cost is already incurred.
   */
  aiResponseLimitMonthly: number | null;
  /**
   * On Esencial the AI only drafts a reply for a human to review/send
   * (never sends autonomously); Profesional and Clinica reply and
   * book appointments on their own, 24/7. Purely descriptive — the
   * actual behavior switch lives wherever auto-reply is dispatched,
   * this just drives the landing page / settings copy.
   */
  aiAutonomous: boolean;
  /** Stripe Price IDs — undefined until the corresponding env var is set. */
  stripeBasePriceId?: string;
  stripeSeatPriceId?: string;
  /** Whether this plan is ever purchasable via Checkout (trial isn't — it's the signup default). */
  purchasable: boolean;
}

export const PLAN_CONFIG: Record<Plan, PlanDefinition> = {
  trial: {
    id: "trial",
    basePriceUsd: 0,
    seatPriceUsd: null,
    includedSeats: 1,
    // Not capped by patient count — the 30-day window is the real
    // constraint on a free trial, not volume. The free trial also has
    // no WhatsApp/AI at all per the landing page, so this number is
    // moot in practice (nothing calls the AI provider pre-upgrade),
    // kept only as a defensive ceiling.
    patientLimit: null,
    aiResponseLimitMonthly: 0,
    aiAutonomous: false,
    purchasable: false,
  },
  esencial: {
    id: "esencial",
    basePriceUsd: 49,
    seatPriceUsd: 25,
    includedSeats: 1,
    patientLimit: 1000,
    aiResponseLimitMonthly: 300,
    aiAutonomous: false,
    stripeBasePriceId: process.env.STRIPE_PRICE_ESENCIAL_BASE,
    stripeSeatPriceId: process.env.STRIPE_PRICE_SEAT_ADDON,
    purchasable: true,
  },
  profesional: {
    id: "profesional",
    basePriceUsd: 99,
    seatPriceUsd: 25,
    includedSeats: 3,
    patientLimit: 5000,
    aiResponseLimitMonthly: 2000,
    aiAutonomous: true,
    stripeBasePriceId: process.env.STRIPE_PRICE_PROFESIONAL_BASE,
    stripeSeatPriceId: process.env.STRIPE_PRICE_SEAT_ADDON,
    purchasable: true,
  },
  clinica: {
    id: "clinica",
    basePriceUsd: 149,
    seatPriceUsd: 25,
    includedSeats: 5,
    patientLimit: null,
    aiResponseLimitMonthly: 6000,
    aiAutonomous: true,
    stripeBasePriceId: process.env.STRIPE_PRICE_CLINICA_BASE,
    stripeSeatPriceId: process.env.STRIPE_PRICE_SEAT_ADDON,
    purchasable: true,
  },
};

/**
 * Binary gate: does this account currently have the right to use the
 * product at all, or has its trial lapsed / subscription lapsed with
 * nothing active. Independent of `features.ts`'s per-feature tier
 * gating (automations, AI auto-reply, patient limits) — this only
 * answers "is the account locked out entirely."
 */
export function hasActiveAccess(status: SubscriptionStatus): boolean {
  return status === "trialing" || status === "active" || status === "past_due";
}

export function seatsIncluded(plan: Plan): number {
  return PLAN_CONFIG[plan].includedSeats;
}

export function seatPriceUsd(plan: Plan): number | null {
  return PLAN_CONFIG[plan].seatPriceUsd;
}
