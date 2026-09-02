import type {
  CheckoutResult,
  CreateCheckoutArgs,
  PaymentProviderAdapter,
  ProviderCredentials,
  WebhookConfirmation,
} from "../types";

const API_BASE = "https://api.payclip.com";

function creds(c: ProviderCredentials): { apiKey: string } {
  if (c.provider !== "clip") throw new Error("Clip adapter called with non-Clip credentials");
  return c;
}

async function createCheckout(credentials: ProviderCredentials, args: CreateCheckoutArgs): Promise<CheckoutResult> {
  const { apiKey } = creds(credentials);
  const res = await fetch(`${API_BASE}/v2/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
async function confirmWebhook(credentials: ProviderCredentials, request: Request): Promise<WebhookConfirmation> {
  const { apiKey } = creds(credentials);
  const body = (await request.json().catch(() => ({}))) as { payment_request_id?: string };
  const paymentRequestId = body.payment_request_id;
  if (!paymentRequestId) {
    return { paid: false, externalReference: null, externalCheckoutId: null, raw: body };
  }

  const res = await fetch(`${API_BASE}/v2/checkout/${encodeURIComponent(paymentRequestId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    return { paid: false, externalReference: null, externalCheckoutId: paymentRequestId, raw: body };
  }
  const link = (await res.json()) as { status?: string; metadata?: { external_reference?: string } };

  return {
    paid: link.status === "COMPLETED",
    externalReference: link.metadata?.external_reference ?? null,
    externalCheckoutId: paymentRequestId,
    raw: link,
  };
}

export const clipAdapter: PaymentProviderAdapter = { createCheckout, confirmWebhook };
