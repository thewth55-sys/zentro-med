import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentProviderId } from "./types";
import { loadActivePaymentGatewayConfig } from "./config";
import { getPaymentAdapter } from "./gateway";

/**
 * Shared body for the three provider webhook routes
 * (src/app/api/webhooks/payments/{stripe,mercadopago,clip}/[accountId]).
 * Each route just picks the account's config, hands the raw Request
 * to the matching adapter (which does its own signature check and/or
 * authoritative re-fetch — see each adapter's `confirmWebhook`), and
 * this function does the shared "update appointment_deposits"
 * bookkeeping — idempotent, since providers retry webhooks.
 */
export async function handlePaymentWebhook(
  admin: SupabaseClient,
  provider: PaymentProviderId,
  accountId: string,
  request: Request,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const config = await loadActivePaymentGatewayConfig(admin, accountId);
  if (!config || config.provider !== provider) {
    // Not an error worth retrying — this account doesn't have this
    // provider active (anymore). Acknowledge so the provider stops
    // retrying.
    return { status: 200, body: { received: true, ignored: true } };
  }

  let confirmation;
  try {
    confirmation = await getPaymentAdapter(provider).confirmWebhook(config.credentials, request);
  } catch (err) {
    console.error(`[payments webhook:${provider}] confirmWebhook threw for account ${accountId}:`, err);
    return { status: 400, body: { error: "Invalid webhook" } };
  }

  if (!confirmation.externalReference) {
    return { status: 200, body: { received: true, ignored: true } };
  }

  const { data: depositRow } = await admin
    .from("appointment_deposits")
    .select("id, status")
    .eq("external_reference", confirmation.externalReference)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!depositRow) {
    console.warn(
      `[payments webhook:${provider}] no appointment_deposits row for external_reference ${confirmation.externalReference} (account ${accountId})`,
    );
    return { status: 200, body: { received: true, ignored: true } };
  }

  // Idempotent — a provider retrying the same webhook (or firing
  // several events for one payment) must never un-pay or double-log.
  if (depositRow.status === "paid") {
    return { status: 200, body: { received: true } };
  }

  const update: Record<string, unknown> = { raw_webhook: confirmation.raw };
  if (confirmation.externalCheckoutId) update.external_checkout_id = confirmation.externalCheckoutId;
  if (confirmation.paid) {
    update.status = "paid";
    update.paid_at = new Date().toISOString();
  }

  const { error } = await admin.from("appointment_deposits").update(update).eq("id", depositRow.id);
  if (error) {
    console.error(`[payments webhook:${provider}] failed to update appointment_deposits ${depositRow.id}:`, error);
    return { status: 500, body: { error: "Failed to record payment" } };
  }

  return { status: 200, body: { received: true } };
}
