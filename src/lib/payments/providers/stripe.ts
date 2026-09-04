import Stripe from "stripe";
import type {
  CheckoutResult,
  CreateCheckoutArgs,
  PaymentProviderAdapter,
  ProviderCredentials,
  WebhookConfirmation,
} from "../types";

// Per-account client, built from THAT account's own Stripe secret key
// (payment_gateway_configs.credentials) — deliberately separate from
// src/lib/billing-platform/stripe.ts's getStripeClient(), which is
// Zentro Med's OWN Stripe account billing clinics for their SaaS
// subscription. A clinic's patient-deposit Stripe account has nothing
// to do with that.
function client(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
}

function creds(c: ProviderCredentials): { secretKey: string; webhookSecret: string } {
  if (c.provider !== "stripe") throw new Error("Stripe adapter called with non-Stripe credentials");
  return c;
}

async function createCheckout(credentials: ProviderCredentials, args: CreateCheckoutArgs): Promise<CheckoutResult> {
  const { secretKey } = creds(credentials);
  const session = await client(secretKey).checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: args.currency.toLowerCase(),
          unit_amount: Math.round(args.amount * 100),
          product_data: { name: args.description },
        },
        quantity: 1,
      },
    ],
    customer_email: args.customerEmail || undefined,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    client_reference_id: args.externalReference,
    metadata: { external_reference: args.externalReference },
  });
  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  return { checkoutUrl: session.url, externalCheckoutId: session.id };
}

async function confirmWebhook(credentials: ProviderCredentials, request: Request): Promise<WebhookConfirmation> {
  const { secretKey, webhookSecret } = creds(credentials);
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  if (!signature) {
    return { paid: false, externalReference: null, externalCheckoutId: null, raw: null };
  }

  // Stripe's own SDK signature verification is cryptographically
  // authoritative (HMAC over the raw body with the account's webhook
  // signing secret) — unlike Mercado Pago/Clip below, no extra
  // re-fetch is needed once this passes.
  const event = client(secretKey).webhooks.constructEvent(rawBody, signature, webhookSecret);

  if (event.type !== "checkout.session.completed") {
    return { paid: false, externalReference: null, externalCheckoutId: null, raw: event };
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const externalReference =
    (session.metadata?.external_reference as string | undefined) ?? session.client_reference_id ?? null;

  return {
    paid: session.payment_status === "paid",
    externalReference,
    externalCheckoutId: session.id,
    raw: event,
  };
}

/** Active reconciliation for the confirmation page — Stripe's webhook
 *  path is cryptographically signed and can't be replayed/simulated,
 *  but a plain authenticated retrieve-by-session-id needs no
 *  signature at all and is exactly what Stripe's own docs recommend
 *  for "the webhook may not have arrived yet" polling. */
async function checkStatus(
  credentials: ProviderCredentials,
  deposit: { externalCheckoutId: string | null; externalReference: string },
): Promise<WebhookConfirmation> {
  const { secretKey } = creds(credentials);
  if (!deposit.externalCheckoutId) {
    return { paid: false, externalReference: null, externalCheckoutId: null, raw: null };
  }
  const session = await client(secretKey).checkout.sessions.retrieve(deposit.externalCheckoutId);
  const externalReference =
    (session.metadata?.external_reference as string | undefined) ?? session.client_reference_id ?? null;
  return {
    paid: session.payment_status === "paid",
    externalReference,
    externalCheckoutId: session.id,
    raw: session,
  };
}

export const stripeAdapter: PaymentProviderAdapter = { createCheckout, confirmWebhook, checkStatus };
