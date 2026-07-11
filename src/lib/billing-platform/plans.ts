/**
 * Single source of truth for what Zentro Med sells and how much it
 * costs — every price/seat number lives here, not scattered across
 * Checkout/webhook/pricing-page code. Adjusting a price is a one-line
 * change to this file, not a hunt through the codebase.
 *
 * The USD numbers are a deliberate starting point, not load-bearing
 * architecture — see the plan doc. Standalone seats are priced above
 * bundle seats on purpose: it's the lever that makes the
 * Zentro Salud bundle read as the obvious choice over a bare CRM.
 */

export type Plan = "trial" | "standalone" | "zentro_salud_starter" | "zentro_salud_pro";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "trial_expired";

export const TRIAL_DAYS = 30;
export const DEFAULT_INCLUDED_SEATS = 2;

export interface PlanDefinition {
  id: Plan;
  /** Flat monthly price in USD. 0 for trial (no card) and standalone (pure per-seat). */
  basePriceUsd: number;
  /** USD per seat beyond includedSeats. null when the plan has no seat billing of its own (trial). */
  seatPriceUsd: number | null;
  includedSeats: number;
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
    includedSeats: DEFAULT_INCLUDED_SEATS,
    purchasable: false,
  },
  standalone: {
    id: "standalone",
    basePriceUsd: 0,
    seatPriceUsd: 35,
    includedSeats: 0,
    stripeSeatPriceId: process.env.STRIPE_PRICE_STANDALONE_SEAT,
    purchasable: true,
  },
  zentro_salud_starter: {
    id: "zentro_salud_starter",
    basePriceUsd: 299,
    seatPriceUsd: 15,
    includedSeats: DEFAULT_INCLUDED_SEATS,
    stripeBasePriceId: process.env.STRIPE_PRICE_ZENTRO_SALUD_STARTER,
    stripeSeatPriceId: process.env.STRIPE_PRICE_SEAT_ADDON,
    purchasable: true,
  },
  zentro_salud_pro: {
    id: "zentro_salud_pro",
    basePriceUsd: 499,
    seatPriceUsd: 15,
    includedSeats: DEFAULT_INCLUDED_SEATS,
    stripeBasePriceId: process.env.STRIPE_PRICE_ZENTRO_SALUD_PRO,
    stripeSeatPriceId: process.env.STRIPE_PRICE_SEAT_ADDON,
    purchasable: true,
  },
};

/**
 * Every plan (trial while active, standalone, both Zentro Salud
 * bundles) unlocks the full app — there's no per-module gating
 * between tiers. What differs between the two bundles is agency
 * service delivery (Google Ads, SEO) outside this codebase, not
 * in-app features. The only gate that exists here is binary: does
 * this account currently have the right to use the product at all,
 * or has its trial lapsed / subscription lapsed with nothing active.
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
