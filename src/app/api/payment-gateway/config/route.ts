import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { resolveFeatureAccess, type FeatureOverrides } from "@/lib/billing-platform/features";
import type { Plan } from "@/lib/billing-platform/plans";
import { decrypt } from "@/lib/whatsapp/encryption";
import { encryptCredentials } from "@/lib/payments/config";
import { isProviderCredentials } from "@/lib/payments/gateway";
import { PAYMENT_PROVIDERS, type PaymentProviderId } from "@/lib/payments/types";

/**
 * Settings-class config for the deposit payment gateway (Ajustes →
 * Agenda). Admin-only for both read and write, unlike most
 * settings-class configs (any member reads) — this one holds live
 * payment credentials, not just preferences.
 */

interface ConfigRow {
  provider: PaymentProviderId;
  is_active: boolean;
  deposit_amount: number;
  currency: string;
}

export async function GET() {
  try {
    const { supabase, accountId } = await requireRole("admin");

    const { data, error } = await supabase
      .from("payment_gateway_configs")
      .select("provider, is_active, deposit_amount, currency")
      .eq("account_id", accountId)
      .maybeSingle<ConfigRow>();

    if (error) {
      console.error("[payment-gateway/config GET] load error:", error);
      return NextResponse.json({ error: "Failed to load configuration" }, { status: 500 });
    }

    // Credentials are never round-tripped, even encrypted — same
    // posture as ai_configs.api_key / conversion_tracking_config's
    // meta_access_token. `has_credentials` is all the client needs to
    // decide whether to show "re-enter to change" vs. empty fields.
    return NextResponse.json({
      config: data ? { ...data, has_credentials: true } : null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Only picks out non-empty string fields — the client sends an empty
 *  string for any field the user left blank (meaning "keep the
 *  stored value"), never as "clear this on purpose." Never trust an
 *  empty string as a real credential value. */
function nonEmptyFields(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim().length > 0) out[k] = v.trim();
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole("admin");

    const { data: account } = await supabase
      .from("accounts")
      .select("plan, feature_overrides")
      .eq("id", accountId)
      .maybeSingle<{ plan: Plan; feature_overrides: FeatureOverrides | null }>();
    const enabled = account ? resolveFeatureAccess(account.plan, "payment_gateway", account.feature_overrides) : false;
    if (!enabled) {
      return NextResponse.json(
        { error: "La pasarela de pago está disponible en planes de pago.", code: "feature_not_available" },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const provider = body.provider as PaymentProviderId;
    if (!PAYMENT_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: `'provider' must be one of: ${PAYMENT_PROVIDERS.join(", ")}` }, { status: 400 });
    }

    const depositAmount = Number(body.deposit_amount);
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      return NextResponse.json({ error: "'deposit_amount' must be a non-negative number" }, { status: 400 });
    }

    const currency = typeof body.currency === "string" && /^[A-Z]{3}$/.test(body.currency) ? body.currency : "MXN";
    const isActive = Boolean(body.is_active);

    // Merge, don't replace: any field the caller left blank means
    // "keep what's already stored," so changing just the webhook
    // secret (say) doesn't require re-typing the secret key too.
    // Switching provider discards the old blob entirely — a
    // Mercado Pago access token has no business surviving as a
    // Stripe secret key.
    const { data: existing } = await supabase
      .from("payment_gateway_configs")
      .select("credentials, provider")
      .eq("account_id", accountId)
      .maybeSingle<{ credentials: string; provider: PaymentProviderId }>();

    let existingFields: Record<string, unknown> = {};
    if (existing && existing.provider === provider) {
      try {
        existingFields = JSON.parse(decrypt(existing.credentials));
      } catch (err) {
        console.error("[payment-gateway/config POST] failed to decrypt existing credentials:", err);
      }
    }

    const merged = { provider, ...existingFields, ...nonEmptyFields(body.credentials) };
    if (!isProviderCredentials(provider, merged)) {
      return NextResponse.json(
        { error: "Faltan credenciales del proveedor — completa todos los campos requeridos." },
        { status: 400 },
      );
    }
    const encryptedCredentials = encryptCredentials(merged);
    if (isActive && depositAmount <= 0) {
      return NextResponse.json({ error: "Define un monto de anticipo mayor a cero antes de activar" }, { status: 400 });
    }

    const { error } = await supabase.from("payment_gateway_configs").upsert(
      {
        account_id: accountId,
        created_by: userId,
        provider,
        is_active: isActive,
        credentials: encryptedCredentials,
        deposit_amount: depositAmount,
        currency,
      },
      { onConflict: "account_id" },
    );

    if (error) {
      console.error("[payment-gateway/config POST] save error:", error);
      return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
