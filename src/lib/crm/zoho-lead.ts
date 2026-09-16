// ============================================================
// Zoho CRM Lead creation for new Zentro Med accounts.
//
// Every self-serve signup starts on the `trial` plan (see
// src/app/(auth)/signup/page.tsx) and lands in `accounts` via
// handle_new_user() — the platform's only paid-acquisition funnel
// right now. This module pushes each new account into Zoho CRM as a
// Lead so the commercial side (currently a manual daily review) has
// every trial in one pipeline instead of having to cross-check the
// admin panel by hand.
//
// Called from src/app/api/internal/webhooks/new-account/route.ts,
// which already fires exactly once per signup (see that file's
// header comment for why it's the right place). This module never
// throws past its own boundary in normal operation — every failure
// path returns a rejected promise with a descriptive message, and the
// caller is responsible for catching it and logging via
// `logIntegrationError` (same "never break the caller" posture as
// dispatchPlatformWebhookEvent and the two email sends in that file).
//
// Configuration (Infisical / environment):
//   ZOHO_CRM_CLIENT_ID       — from a Zoho API Console "Server-based
//                               Applications" client (Setup → Zoho
//                               Developer Console at
//                               api-console.zoho.com)
//   ZOHO_CRM_CLIENT_SECRET   — same client
//   ZOHO_CRM_REFRESH_TOKEN   — minted once via the OAuth consent flow
//                               for that client, scope
//                               ZohoCRM.modules.leads.CREATE (add
//                               .READ too if this module ever needs to
//                               search/dedupe)
//   ZOHO_CRM_ACCOUNTS_URL    — optional, defaults to
//                               https://accounts.zoho.com — change if
//                               this Zoho org's data center isn't the
//                               US one (.eu / .in / .com.au / .jp)
//   ZOHO_CRM_API_DOMAIN      — optional, defaults to
//                               https://www.zohoapis.com — same
//                               data-center caveat as above; Zoho's
//                               token response includes the correct
//                               api_domain for the authenticating org,
//                               so this is only a fallback for the
//                               first call before any token has been
//                               fetched
//   ZOHO_CRM_LEAD_SOURCE     — optional. Zoho rejects a Lead_Source
//                               value that isn't already one of the
//                               org's configured picklist options, and
//                               this module has no way to read that
//                               list — set this to an exact existing
//                               value (Setup → Customization → Leads
//                               → Lead Source) if you want it
//                               populated. Left unset, the field is
//                               just omitted, which is always safe.
//
// Without the three required vars set, createZohoLeadFromAccount()
// no-ops (resolves immediately, does nothing) — same pattern
// dispatchPlatformWebhookEvent uses for PLATFORM_WEBHOOK_ACCOUNT_ID,
// so this file can ship and deploy before Zoho CRM credentials exist
// without breaking signup.
// ============================================================

const DEFAULT_ACCOUNTS_URL = 'https://accounts.zoho.com';
const DEFAULT_API_DOMAIN = 'https://www.zohoapis.com';

/** Per-request timeout for each of the two calls (token, then Lead create). */
const REQUEST_TIMEOUT_MS = 8000;

export interface AccountLeadInput {
  /** `accounts.id` — carried in the Lead's Description so a rep can jump to /admin from the CRM record. */
  accountId: string;
  /** `accounts.name` (brand/clinic name) — mapped to Company. */
  accountName: string;
  ownerEmail: string | null;
  ownerFullName: string | null;
  phone?: string | null;
  website?: string | null;
  /** `accounts.plan` — 'trial' for the overwhelming majority of signups today. */
  plan?: string | null;
  specialty?: string | null;
  country?: string | null;
}

interface CachedToken {
  accessToken: string;
  apiDomain: string;
  /** Epoch ms after which this token is treated as expired (refreshed a minute early). */
  expiresAt: number;
}

// Module-scope cache: a warm serverless instance reuses the access
// token across invocations instead of re-authenticating on every
// signup. Cold starts (or the ~55-minute expiry) just refetch — no
// persistence needed, Zoho's refresh token itself doesn't expire from
// normal use.
let cachedToken: CachedToken | null = null;

function requiredEnv() {
  const clientId = process.env.ZOHO_CRM_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CRM_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_CRM_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

async function getAccessToken(): Promise<{
  accessToken: string;
  apiDomain: string;
}> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) {
    return {
      accessToken: cachedToken.accessToken,
      apiDomain: cachedToken.apiDomain,
    };
  }

  const env = requiredEnv();
  if (!env) throw new Error('Zoho CRM credentials not configured');

  const accountsUrl = process.env.ZOHO_CRM_ACCOUNTS_URL || DEFAULT_ACCOUNTS_URL;
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: env.refreshToken,
  });

  const res = await fetch(`${accountsUrl}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    throw new Error(
      `Zoho OAuth token refresh failed (${res.status}): ${body?.error ?? 'unknown error'}`
    );
  }

  const apiDomain =
    typeof body.api_domain === 'string' ? body.api_domain : DEFAULT_API_DOMAIN;
  // expires_in is seconds (Zoho access tokens last ~3600s); refresh a
  // minute early so a slow request never straddles the real expiry.
  const expiresInMs =
    (typeof body.expires_in === 'number' ? body.expires_in : 3600) * 1000;
  cachedToken = {
    accessToken: body.access_token,
    apiDomain,
    expiresAt: now + expiresInMs - 60_000,
  };
  return {
    accessToken: cachedToken.accessToken,
    apiDomain: cachedToken.apiDomain,
  };
}

/** Best-effort "First Last" split — Zoho's Leads module requires Last_Name. */
function splitName(fullName: string | null): {
  firstName?: string;
  lastName: string;
} {
  const trimmed = fullName?.trim();
  if (!trimmed) return { lastName: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { lastName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

const PLAN_LABEL: Record<string, string> = {
  trial: 'Prueba',
  esencial: 'Esencial',
  profesional: 'Profesional',
  clinica: 'Clínica',
};

function buildDescription(input: AccountLeadInput): string {
  const lines = [
    `Cuenta Zentro Med: ${input.accountName}`,
    `Plan: ${PLAN_LABEL[input.plan ?? ''] ?? input.plan ?? '—'}`,
  ];
  if (input.specialty) lines.push(`Especialidad: ${input.specialty}`);
  if (input.country) lines.push(`País: ${input.country}`);
  lines.push(
    `Panel de admin: https://med.zentrolabs.com/admin/accounts/${input.accountId}`
  );
  return lines.join('\n');
}

/**
 * Create a Zoho CRM Lead for a newly created Zentro Med account.
 * No-ops (resolves without doing anything) when Zoho CRM credentials
 * aren't configured. Throws a descriptive Error on any other failure
 * — callers must catch it; this function does not log or swallow
 * errors itself, so it can be unit-tested without a logging side
 * channel.
 */
export async function createZohoLeadFromAccount(
  input: AccountLeadInput
): Promise<void> {
  if (!requiredEnv()) return;

  const { accessToken, apiDomain } = await getAccessToken();
  const { firstName, lastName } = splitName(input.ownerFullName);

  const leadData: Record<string, unknown> = {
    Company: input.accountName || 'Zentro Med — cuenta nueva',
    Last_Name: lastName || input.accountName || 'Cuenta nueva',
    Description: buildDescription(input),
  };
  if (firstName) leadData.First_Name = firstName;
  if (input.ownerEmail) leadData.Email = input.ownerEmail;
  if (input.phone) leadData.Phone = input.phone;
  if (input.website) leadData.Website = input.website;
  const leadSource = process.env.ZOHO_CRM_LEAD_SOURCE;
  if (leadSource) leadData.Lead_Source = leadSource;

  const res = await fetch(`${apiDomain}/crm/v2/Leads`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: [leadData] }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const body = await res.json().catch(() => null);
  const result = body?.data?.[0];
  if (!res.ok || result?.status !== 'success') {
    const detail = result?.message ?? body?.message ?? `HTTP ${res.status}`;
    throw new Error(`Zoho CRM Lead creation failed: ${detail}`);
  }
}
