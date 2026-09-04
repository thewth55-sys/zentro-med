import type { SupabaseClient } from "@supabase/supabase-js";

import { loadActivePaymentGatewayConfig } from "./config";
import { getPaymentAdapter } from "./gateway";
import { markDepositPaid, type PaidDeposit } from "./mark-deposit-paid";

export interface DepositReconcileResult {
  status: "pending" | "paid" | "failed" | "expired" | "canceled";
  amount: number;
  currency: string;
  appointmentId: string;
}

/**
 * Actively re-checks a still-`pending` deposit against the gateway
 * instead of just waiting for a webhook that may never arrive (wrong
 * webhook_url, provider outage, a dropped event — see the confirmation
 * page's polling for why this exists). Safe to call repeatedly: a
 * deposit already in a terminal state is returned as-is without
 * touching the gateway or the database again.
 */
export async function reconcileDeposit(admin: SupabaseClient, accountId: string, depositId: string): Promise<DepositReconcileResult | null> {
  const { data: deposit } = await admin
    .from("appointment_deposits")
    .select("id, status, account_id, appointment_id, provider, external_reference, external_checkout_id, amount, currency")
    .eq("id", depositId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!deposit) return null;

  if (deposit.status !== "pending") {
    return {
      status: deposit.status,
      amount: deposit.amount,
      currency: deposit.currency,
      appointmentId: deposit.appointment_id,
    };
  }

  const config = await loadActivePaymentGatewayConfig(admin, accountId);
  if (!config || config.provider !== deposit.provider) {
    // The gateway got disconnected/changed since this checkout was
    // created — nothing to check against. Leave it pending; staff can
    // reconcile manually if needed.
    return { status: "pending", amount: deposit.amount, currency: deposit.currency, appointmentId: deposit.appointment_id };
  }

  const confirmation = await getPaymentAdapter(config.provider)
    .checkStatus(config.credentials, {
      externalCheckoutId: deposit.external_checkout_id,
      externalReference: deposit.external_reference,
    })
    .catch((err) => {
      console.error(`[payments] checkStatus failed for deposit ${deposit.id}:`, err);
      return null;
    });

  if (confirmation?.paid) {
    const paidDeposit: PaidDeposit = {
      id: deposit.id,
      account_id: deposit.account_id,
      appointment_id: deposit.appointment_id,
      provider: deposit.provider,
      external_reference: deposit.external_reference,
      amount: deposit.amount,
      currency: deposit.currency,
    };
    try {
      await markDepositPaid(admin, paidDeposit, confirmation);
      return { status: "paid", amount: deposit.amount, currency: deposit.currency, appointmentId: deposit.appointment_id };
    } catch (err) {
      console.error(`[payments] reconcile markDepositPaid failed for ${deposit.id}:`, err);
    }
  }

  return { status: "pending", amount: deposit.amount, currency: deposit.currency, appointmentId: deposit.appointment_id };
}
