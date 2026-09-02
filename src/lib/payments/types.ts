// ============================================================
// Shared contract every payment-gateway adapter implements
// (src/lib/payments/providers/{stripe,mercadopago,clip}.ts). The
// booking route and the webhook routes only ever talk to this
// interface, never to a specific provider's SDK/HTTP shape directly —
// see src/lib/payments/gateway.ts for the dispatcher.
// ============================================================

export type PaymentProviderId = "stripe" | "mercadopago" | "clip";

export const PAYMENT_PROVIDERS: PaymentProviderId[] = ["stripe", "mercadopago", "clip"];

export const PAYMENT_PROVIDER_LABEL: Record<PaymentProviderId, string> = {
  stripe: "Stripe",
  mercadopago: "Mercado Pago",
  clip: "Clip",
};

/** Decrypted, provider-specific credential shape — stored as one
 *  encrypted JSON blob in `payment_gateway_configs.credentials`. */
export type ProviderCredentials =
  | { provider: "stripe"; secretKey: string; webhookSecret: string }
  | { provider: "mercadopago"; accessToken: string }
  | { provider: "clip"; apiKey: string };

export interface CreateCheckoutArgs {
  amount: number;
  currency: string;
  description: string;
  /** OUR OWN id (appointment_deposits.external_reference) — passed to
   *  the provider as metadata/external_reference so the webhook can
   *  always find the right row, even if the provider's own
   *  session/preference/link id isn't echoed back consistently. */
  externalReference: string;
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  /** The provider's own session/preference/payment-link id. */
  externalCheckoutId: string;
}

export interface WebhookConfirmation {
  /**
   * true ONLY when the provider's own API — re-fetched server-side
   * with OUR stored credentials, never the push payload alone —
   * confirms the payment actually completed. A forged webhook POST
   * can't flip this to true: it can only make us re-check, and the
   * re-check talks to the real provider with our own secret.
   */
  paid: boolean;
  externalReference: string | null;
  externalCheckoutId: string | null;
  raw: unknown;
}

export interface PaymentProviderAdapter {
  createCheckout(credentials: ProviderCredentials, args: CreateCheckoutArgs): Promise<CheckoutResult>;
  confirmWebhook(credentials: ProviderCredentials, request: Request): Promise<WebhookConfirmation>;
}
