import type { SupabaseClient } from "@supabase/supabase-js";

import { PAYMENT_PROVIDER_LABEL, type PaymentProviderId, type WebhookConfirmation } from "./types";

export interface PaidInvoiceCheckout {
  id: string;
  account_id: string;
  invoice_id: string;
  provider: PaymentProviderId;
  external_reference: string;
  amount: number;
}

/**
 * Analogous to `markDepositPaid`, but for a checkout link generated
 * against an EXISTING invoice (`invoice_checkouts` — see migration
 * 111) instead of a public-booking deposit that creates a brand-new
 * one. Marks the checkout row paid and records a real `payments` row
 * against the invoice — the `recompute_invoice_amount_paid` trigger
 * (039_billing_core.sql) takes it from there (amount_paid + status).
 *
 * Not idempotent by itself — callers must check `status !== 'paid'`
 * first (same contract as `markDepositPaid`).
 */
export async function markInvoiceCheckoutPaid(
  admin: SupabaseClient,
  checkout: PaidInvoiceCheckout,
  confirmation: WebhookConfirmation,
): Promise<void> {
  const update: Record<string, unknown> = {
    status: "paid",
    raw_webhook: confirmation.raw,
  };
  if (confirmation.externalCheckoutId) update.external_checkout_id = confirmation.externalCheckoutId;

  const { error: checkoutError } = await admin.from("invoice_checkouts").update(update).eq("id", checkout.id);
  if (checkoutError) {
    console.error(`[payments] failed to mark invoice_checkouts ${checkout.id} paid:`, checkoutError);
    throw checkoutError;
  }

  const providerLabel = PAYMENT_PROVIDER_LABEL[checkout.provider];

  const { error: paymentError } = await admin.from("payments").insert({
    account_id: checkout.account_id,
    invoice_id: checkout.invoice_id,
    amount: checkout.amount,
    method: "card",
    paid_at: new Date().toISOString(),
    notes: `${providerLabel} — ref. ${checkout.external_reference}`,
  });
  if (paymentError) {
    console.error(`[payments] invoice_checkouts ${checkout.id} paid but payment insert failed:`, paymentError);
    throw paymentError;
  }
}
