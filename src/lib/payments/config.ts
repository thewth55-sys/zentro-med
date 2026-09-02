import type { SupabaseClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "@/lib/whatsapp/encryption";
import type { PaymentProviderId, ProviderCredentials } from "./types";
import { isProviderCredentials } from "./gateway";

export interface PaymentGatewayConfig {
  provider: PaymentProviderId;
  isActive: boolean;
  credentials: ProviderCredentials;
  depositAmount: number;
  currency: string;
}

/** Loads and decrypts an account's active payment-gateway config, or
 *  null if none is configured/active/malformed. Used by the public
 *  booking route (deposit checkout) and by the three webhook routes
 *  (to know which provider/credentials a given account uses). */
export async function loadActivePaymentGatewayConfig(
  db: SupabaseClient,
  accountId: string,
): Promise<PaymentGatewayConfig | null> {
  const { data } = await db
    .from("payment_gateway_configs")
    .select("provider, is_active, credentials, deposit_amount, currency")
    .eq("account_id", accountId)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;

  let credentials: unknown;
  try {
    credentials = JSON.parse(decrypt(data.credentials));
  } catch (err) {
    console.error(`[payments] failed to decrypt credentials for account ${accountId}:`, err);
    return null;
  }
  const provider = data.provider as PaymentProviderId;
  if (!isProviderCredentials(provider, credentials)) {
    console.error(`[payments] stored credentials for account ${accountId} don't match provider ${provider}`);
    return null;
  }

  return {
    provider,
    isActive: data.is_active,
    credentials: credentials as ProviderCredentials,
    depositAmount: Number(data.deposit_amount),
    currency: data.currency as string,
  };
}

/** Encrypts a credentials object for storage — the inverse of the
 *  decrypt+JSON.parse above. */
export function encryptCredentials(credentials: ProviderCredentials): string {
  return encrypt(JSON.stringify(credentials));
}
