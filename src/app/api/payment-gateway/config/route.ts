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
  booking_terms: string | null;
}

/** Never the value itself — just enough for a human to recognize
 *  "yes, that's my key" (Stripe/Clip's own dashboards do the same
 *  last-4 preview). A value too short to mask meaningfully still
 *  reveals nothing usable. */
function maskLast4(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

export async function GET() {
  try {
    const { supabase, accountId } = await requireRole("admin");

    const { data, error } = await supabase
      .from("payment_gateway_configs")
      .select("provider, is_active, deposit_amount, currency, booking_terms, credentials")
      .eq("account_id", accountId)
      .maybeSingle<ConfigRow & { credentials: string }>();

    if (error) {
      console.error("[payment-gateway/config GET] load error:", error);
      return NextResponse.json({ error: "Failed to load configuration" }, { status: 500 });
    }

    // Credentials are never round-tripped in full, even encrypted —
    // same posture as ai_configs.api_key / conversion_tracking_config's
    // meta_access_token. `has_credentials` is what the client uses to
    // decide "re-enter to change" vs. empty fields; `credentials_preview`
    // additionally gives a last-4-chars-only mask per field (decrypted
    // server-side, only the tail ever leaves this function) so the
    // settings screen can show "•••• a1b2" instead of leaving it
    // ambiguous whether anything is actually configured.
    if (!data) {
      return NextResponse.json({ config: null });
    }

    let credentialsPreview: Record<string, string> = {};
    try {
      const parsed = JSON.parse(decrypt(data.credentials)) as Record<string, unknown>;
      for (const [key, value] of Object.entries(parsed)) {
        if (key === "provider" || typeof value !== "string") continue;
        credentialsPreview[key] = maskLast4(value);
      }
    } catch (err) {
      console.error("[payment-gateway/config GET] failed to decrypt credentials for preview:", err);
      credentialsPreview = {};
    }

    return NextResponse.json({
      config: {
        provider: data.provider,
        is_active: data.is_active,
        deposit_amount: data.deposit_amount,
        currency: data.currency,
        booking_terms: data.booking_terms,
        has_credentials: true,
        credentials_preview: credentialsPreview,
      },
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

    // Free text the clinic writes itself — no validation beyond a
    // sane length cap, same posture as accounts.quote_terms.
    const bookingTerms =
      typeof body.booking_terms === "string" && body.booking_terms.trim().length > 0
        ? body.booking_terms.trim().slice(0, 5000)
        : null;

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
        booking_terms: bookingTerms,
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
