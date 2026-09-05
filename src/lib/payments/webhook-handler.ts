import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentProviderId } from "./types";
import { loadActivePaymentGatewayConfig } from "./config";
import { getPaymentAdapter } from "./gateway";
import { markDepositPaid } from "./mark-deposit-paid";
import { markInvoiceCheckoutPaid } from "./mark-invoice-checkout-paid";

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
    .select("id, status, account_id, appointment_id, provider, external_reference, amount, currency")
    .eq("external_reference", confirmation.externalReference)
    .eq("account_id", accountId)
    .maybeSingle();

  if (depositRow) {
    // Idempotent — a provider retrying the same webhook (or firing
    // several events for one payment) must never un-pay or double-log.
    if (depositRow.status === "paid") {
      return { status: 200, body: { received: true } };
    }

    if (!confirmation.paid) {
      // Not a confirmed payment yet (e.g. a "checkout created" event, or
      // the re-fetch came back not-completed) — nothing to record.
      const { error } = await admin
        .from("appointment_deposits")
        .update({ raw_webhook: confirmation.raw, external_checkout_id: confirmation.externalCheckoutId ?? undefined })
        .eq("id", depositRow.id);
      if (error) {
        console.error(`[payments webhook:${provider}] failed to update appointment_deposits ${depositRow.id}:`, error);
        return { status: 500, body: { error: "Failed to record payment" } };
      }
      return { status: 200, body: { received: true } };
    }

    try {
      await markDepositPaid(admin, depositRow, confirmation);
    } catch (err) {
      console.error(`[payments webhook:${provider}] markDepositPaid failed for ${depositRow.id}:`, err);
      return { status: 500, body: { error: "Failed to record payment" } };
    }

    return { status: 200, body: { received: true } };
  }

  // No booking deposit matched this reference — try a plain-invoice
  // checkout link (migration 111) before giving up.
  const { data: checkoutRow } = await admin
    .from("invoice_checkouts")
    .select("id, status, account_id, invoice_id, provider, external_reference, amount")
    .eq("external_reference", confirmation.externalReference)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!checkoutRow) {
    console.warn(
      `[payments webhook:${provider}] no appointment_deposits or invoice_checkouts row for external_reference ${confirmation.externalReference} (account ${accountId})`,
    );
    return { status: 200, body: { received: true, ignored: true } };
  }

  if (checkoutRow.status === "paid") {
    return { status: 200, body: { received: true } };
  }

  if (!confirmation.paid) {
    const { error } = await admin
      .from("invoice_checkouts")
      .update({ raw_webhook: confirmation.raw, external_checkout_id: confirmation.externalCheckoutId ?? undefined })
      .eq("id", checkoutRow.id);
    if (error) {
      console.error(`[payments webhook:${provider}] failed to update invoice_checkouts ${checkoutRow.id}:`, error);
      return { status: 500, body: { error: "Failed to record payment" } };
    }
    return { status: 200, body: { received: true } };
  }

  try {
    await markInvoiceCheckoutPaid(admin, checkoutRow, confirmation);
  } catch (err) {
    console.error(`[payments webhook:${provider}] markInvoiceCheckoutPaid failed for ${checkoutRow.id}:`, err);
    return { status: 500, body: { error: "Failed to record payment" } };
  }

  return { status: 200, body: { received: true } };
}
