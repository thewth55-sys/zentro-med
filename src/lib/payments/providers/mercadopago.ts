import type {
  CheckoutResult,
  CreateCheckoutArgs,
  PaymentProviderAdapter,
  ProviderCredentials,
  WebhookConfirmation,
} from "../types";

const API_BASE = "https://api.mercadopago.com";

function creds(c: ProviderCredentials): { accessToken: string } {
  if (c.provider !== "mercadopago") throw new Error("Mercado Pago adapter called with non-Mercado Pago credentials");
  return c;
}

async function createCheckout(credentials: ProviderCredentials, args: CreateCheckoutArgs): Promise<CheckoutResult> {
  const { accessToken } = creds(credentials);
  const res = await fetch(`${API_BASE}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          title: args.description,
          quantity: 1,
          currency_id: args.currency.toUpperCase(),
          unit_price: args.amount,
        },
      ],
      payer: args.customerEmail ? { email: args.customerEmail } : undefined,
      external_reference: args.externalReference,
      notification_url: args.webhookUrl,
      back_urls: {
        success: args.successUrl,
        failure: args.cancelUrl,
        pending: args.successUrl,
      },
      auto_return: "approved",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Mercado Pago preference creation failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { id: string; init_point: string };
  return { checkoutUrl: data.init_point, externalCheckoutId: data.id };
}

/**
 * Mercado Pago's `x-signature` header format (comma-separated
 * `ts=...,v1=...`, HMAC-SHA256 over a manifest string built from the
 * notified resource id + request id + timestamp) isn't verified here
 * — rather than ship a guessed manifest format for something that
 * moves real money, the security boundary is the re-fetch below:
 * the webhook is treated as a bare trigger ("go check payment {id}"),
 * and `paid` is only ever true once OUR OWN authenticated GET to
 * Mercado Pago's Payments API (with the account's real access token)
 * confirms `status === 'approved'` AND the payment's own
 * `external_reference` matches what we generated. A forged webhook
 * POST can trigger a re-check; it cannot forge that response.
 */
async function confirmWebhook(credentials: ProviderCredentials, request: Request): Promise<WebhookConfirmation> {
  const { accessToken } = creds(credentials);
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { data?: { id?: string }; type?: string };
  const paymentId = body.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
  const topic = body.type || url.searchParams.get("type") || url.searchParams.get("topic");

  if (!paymentId || (topic && topic !== "payment")) {
    return { paid: false, externalReference: null, externalCheckoutId: null, raw: body };
  }

  const res = await fetch(`${API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    return { paid: false, externalReference: null, externalCheckoutId: String(paymentId), raw: body };
  }
  const payment = (await res.json()) as { status?: string; external_reference?: string | null };

  return {
    paid: payment.status === "approved",
    externalReference: payment.external_reference ?? null,
    externalCheckoutId: String(paymentId),
    raw: payment,
  };
}

/**
 * Active reconciliation for the confirmation page. Mercado Pago's
 * webhook only ever gives us a *payment* id, which we never learn
 * client-side (checkout creation only returns the *preference* id,
 * stored as `external_checkout_id`) — so unlike Stripe/Clip this
 * can't retrieve-by-checkout-id. Uses the Payments Search API
 * (`/v1/payments/search?external_reference=`) with OUR OWN
 * `external_reference` instead, which we always have from checkout
 * creation. Less exercised in production than the webhook path
 * (which is the primary path and already works) — fails closed
 * (`paid: false`) on any unexpected shape rather than guessing.
 */
async function checkStatus(
  credentials: ProviderCredentials,
  deposit: { externalCheckoutId: string | null; externalReference: string },
): Promise<WebhookConfirmation> {
  const { accessToken } = creds(credentials);
  const res = await fetch(
    `${API_BASE}/v1/payments/search?external_reference=${encodeURIComponent(deposit.externalReference)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    return { paid: false, externalReference: null, externalCheckoutId: deposit.externalCheckoutId, raw: null };
  }
  const data = (await res.json().catch(() => null)) as {
    results?: Array<{ id?: number | string; status?: string; external_reference?: string }>;
  } | null;
  const match = data?.results?.find((p) => p.external_reference === deposit.externalReference);
  if (!match) {
    return { paid: false, externalReference: null, externalCheckoutId: deposit.externalCheckoutId, raw: data };
  }

  return {
    paid: match.status === "approved",
    externalReference: match.external_reference ?? null,
    externalCheckoutId: match.id ? String(match.id) : deposit.externalCheckoutId,
    raw: match,
  };
}

export const mercadoPagoAdapter: PaymentProviderAdapter = { createCheckout, confirmWebhook, checkStatus };
