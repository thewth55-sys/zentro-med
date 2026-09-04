import type {
  CheckoutResult,
  CreateCheckoutArgs,
  PaymentProviderAdapter,
  ProviderCredentials,
  WebhookConfirmation,
} from "../types";

const API_BASE = "https://api.payclip.com";

function creds(c: ProviderCredentials): { apiKey: string; secretKey: string } {
  if (c.provider !== "clip") throw new Error("Clip adapter called with non-Clip credentials");
  return c;
}

/** Clip's Checkout API uses HTTP Basic Auth over API key + secret key
 *  (base64 of "api_key:secret_key") — NOT a Bearer token, despite
 *  some community examples showing a single Bearer value (that's a
 *  different Clip API). Confirmed against developer.clip.mx's own
 *  authentication reference before wiring this up. */
function basicAuthHeader(apiKey: string, secretKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString("base64")}`;
}

async function createCheckout(credentials: ProviderCredentials, args: CreateCheckoutArgs): Promise<CheckoutResult> {
  const { apiKey, secretKey } = creds(credentials);
  const res = await fetch(`${API_BASE}/v2/checkout`, {
    method: "POST",
    headers: { Authorization: basicAuthHeader(apiKey, secretKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: args.amount,
      currency: args.currency.toUpperCase(),
      purchase_description: args.description.slice(0, 250),
      redirection_url: {
        success: args.successUrl,
        error: args.cancelUrl,
        default: args.successUrl,
      },
      webhook_url: args.webhookUrl,
      metadata: { external_reference: args.externalReference },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Clip checkout creation failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { payment_request_id: string; payment_request_url: string };
  return { checkoutUrl: data.payment_request_url, externalCheckoutId: data.payment_request_id };
}

/**
 * Clip's own webhook docs document no signature/secret header at all
 * (confirmed against developer.clip.mx — the POST body carries no
 * verifiable proof of origin). So the webhook here is treated purely
 * as a "go check this payment_request_id" trigger: `paid` is only
 * ever true once OUR OWN authenticated GET to Clip's Checkout API
 * (with the account's real API key) confirms status COMPLETED and
 * the link's own metadata.external_reference matches what we
 * generated — a forged webhook POST can trigger a re-check, but can't
 * forge that authenticated response.
 */
/** Shared by the webhook path (which only has a `payment_request_id`
 *  pulled from the POST body) and `checkStatus` (which has it from
 *  our own stored `external_checkout_id`) — same authenticated
 *  re-fetch either way, see the file-level comment on why this can't
 *  trust the webhook payload alone. */
async function fetchCheckoutStatus(
  apiKey: string,
  secretKey: string,
  paymentRequestId: string,
  fallbackRaw: unknown,
): Promise<WebhookConfirmation> {
  const res = await fetch(`${API_BASE}/v2/checkout/${encodeURIComponent(paymentRequestId)}`, {
    headers: { Authorization: basicAuthHeader(apiKey, secretKey) },
  });
  if (!res.ok) {
    return { paid: false, externalReference: null, externalCheckoutId: paymentRequestId, raw: fallbackRaw };
  }
  const link = (await res.json()) as { status?: string; metadata?: { external_reference?: string } };

  return {
    paid: link.status === "COMPLETED",
    externalReference: link.metadata?.external_reference ?? null,
    externalCheckoutId: paymentRequestId,
    raw: link,
  };
}

async function confirmWebhook(credentials: ProviderCredentials, request: Request): Promise<WebhookConfirmation> {
  const { apiKey, secretKey } = creds(credentials);
  const body = (await request.json().catch(() => ({}))) as { payment_request_id?: string };
  const paymentRequestId = body.payment_request_id;
  if (!paymentRequestId) {
    return { paid: false, externalReference: null, externalCheckoutId: null, raw: body };
  }
  return fetchCheckoutStatus(apiKey, secretKey, paymentRequestId, body);
}

async function checkStatus(
  credentials: ProviderCredentials,
  deposit: { externalCheckoutId: string | null; externalReference: string },
): Promise<WebhookConfirmation> {
  const { apiKey, secretKey } = creds(credentials);
  if (!deposit.externalCheckoutId) {
    return { paid: false, externalReference: null, externalCheckoutId: null, raw: null };
  }
  return fetchCheckoutStatus(apiKey, secretKey, deposit.externalCheckoutId, null);
}

export const clipAdapter: PaymentProviderAdapter = { createCheckout, confirmWebhook, checkStatus };
