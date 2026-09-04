import type { SupabaseClient } from "@supabase/supabase-js";

import { PAYMENT_PROVIDER_LABEL, type PaymentProviderId, type WebhookConfirmation } from "./types";

export interface PaidDeposit {
  id: string;
  account_id: string;
  appointment_id: string;
  provider: PaymentProviderId;
  external_reference: string;
  amount: number;
  currency: string;
}

/**
 * The one place that turns "the gateway confirms this deposit was
 * paid" into everything that should follow from that: mark the
 * deposit row paid, confirm the appointment (it was sitting in
 * 'pending' forever otherwise — nothing else in the booking flow ever
 * moved it), and — the part that was missing entirely before — leave
 * a real invoice + payment inside Zentro Med's own billing instead of
 * only the gateway's own dashboard knowing money was collected.
 *
 * Called from both the webhook handler and the confirmation page's
 * active reconciliation (src/app/api/public/booking/[slug]/deposit-status),
 * so a paid deposit gets identical treatment no matter which path
 * noticed it first. Callers must check `status !== 'paid'` before
 * calling this — it isn't itself idempotent against being invoked
 * twice for the same deposit (that would create two invoices).
 */
export async function markDepositPaid(
  admin: SupabaseClient,
  deposit: PaidDeposit,
  confirmation: WebhookConfirmation,
): Promise<void> {
  const update: Record<string, unknown> = {
    status: "paid",
    paid_at: new Date().toISOString(),
    raw_webhook: confirmation.raw,
  };
  if (confirmation.externalCheckoutId) update.external_checkout_id = confirmation.externalCheckoutId;

  const { error: depositError } = await admin.from("appointment_deposits").update(update).eq("id", deposit.id);
  if (depositError) {
    console.error(`[payments] failed to mark appointment_deposits ${deposit.id} paid:`, depositError);
    throw depositError;
  }

  const { data: appointment, error: apptError } = await admin
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", deposit.appointment_id)
    .select("contact_id")
    .maybeSingle();
  if (apptError) {
    console.error(`[payments] failed to confirm appointment ${deposit.appointment_id}:`, apptError);
  }

  const contactId = appointment?.contact_id as string | undefined;
  if (!contactId) {
    console.error(
      `[payments] deposit ${deposit.id} paid but appointment ${deposit.appointment_id} has no contact_id — skipping invoice creation`,
    );
    return;
  }

  // El anticipo ya quedó marcado 'paid' arriba pase lo que pase de
  // aquí en adelante — si la factura falla, se pierde el registro
  // contable (grave, se loguea fuerte) pero NO la confirmación del
  // pago al paciente, que ya es lo que se mostró/webhookeó.
  try {
    const { data: invoiceNumber, error: numberError } = await admin.rpc("next_billing_number", {
      p_account_id: deposit.account_id,
      p_doc_type: "invoice",
    });
    if (numberError || !invoiceNumber) throw numberError ?? new Error("next_billing_number returned nothing");

    const providerLabel = PAYMENT_PROVIDER_LABEL[deposit.provider];

    const { data: invoice, error: invoiceError } = await admin
      .from("invoices")
      .insert({
        account_id: deposit.account_id,
        contact_id: contactId,
        appointment_id: deposit.appointment_id,
        invoice_number: invoiceNumber,
        status: "sent",
        subtotal: deposit.amount,
        tax_total: 0,
        total: deposit.amount,
        currency: deposit.currency,
        notes: `Anticipo de reserva en línea — ${providerLabel}, ref. ${deposit.external_reference}`,
      })
      .select("id")
      .single();
    if (invoiceError || !invoice) throw invoiceError ?? new Error("invoice insert returned nothing");

    const { error: itemError } = await admin.from("invoice_items").insert({
      account_id: deposit.account_id,
      invoice_id: invoice.id,
      product_id: null,
      description: "Anticipo de reserva en línea",
      quantity: 1,
      unit_price: deposit.amount,
      tax_rate_snapshot: 0,
      line_total: deposit.amount,
      position: 0,
    });
    if (itemError) throw itemError;

    // El trigger recompute_invoice_amount_paid (039_billing_core.sql)
    // marca la factura como 'paid' automáticamente al insertar esto.
    const { error: paymentError } = await admin.from("payments").insert({
      account_id: deposit.account_id,
      invoice_id: invoice.id,
      amount: deposit.amount,
      method: "card",
      paid_at: new Date().toISOString(),
      notes: `${providerLabel} — ref. ${deposit.external_reference}`,
      appointment_deposit_id: deposit.id,
    });
    if (paymentError) throw paymentError;
  } catch (err) {
    console.error(`[payments] deposit ${deposit.id} paid but invoice/payment creation failed:`, err);
  }
}
