import type { PaymentProviderAdapter, PaymentProviderId, ProviderCredentials } from "./types";
import { stripeAdapter } from "./providers/stripe";
import { mercadoPagoAdapter } from "./providers/mercadopago";
import { clipAdapter } from "./providers/clip";

const ADAPTERS: Record<PaymentProviderId, PaymentProviderAdapter> = {
  stripe: stripeAdapter,
  mercadopago: mercadoPagoAdapter,
  clip: clipAdapter,
};

/** Picks the right provider adapter for a decrypted credentials blob —
 *  the one place that knows which of the three SDK/HTTP shapes to
 *  use. Callers (booking route, webhook routes) only ever import
 *  from this file, never a specific provider module. */
export function getPaymentAdapter(provider: PaymentProviderId): PaymentProviderAdapter {
  return ADAPTERS[provider];
}

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Requires every field non-empty (not just present) — a blank string
 *  must never be accepted as a "real" credential value. See
 *  api/payment-gateway/config/route.ts for why this matters: fields
 *  are merged from a partial update, and an empty string there means
 *  "not provided," never "clear this on purpose." */
export function isProviderCredentials(provider: PaymentProviderId, value: unknown): value is ProviderCredentials {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.provider !== provider) return false;
  switch (provider) {
    case "stripe":
      return nonEmpty(v.secretKey) && nonEmpty(v.webhookSecret);
    case "mercadopago":
      return nonEmpty(v.accessToken);
    case "clip":
      return nonEmpty(v.apiKey) && nonEmpty(v.secretKey);
  }
}
