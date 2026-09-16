// ============================================================
// POST /api/platform-admin/zoho-crm/backfill-leads
//
// One-time (re-runnable) sync: pushes every EXISTING account into
// Zoho CRM as a Lead — trials in progress, trials that expired
// without converting, canceled subscriptions, all of it. The live
// webhook (src/app/api/internal/webhooks/new-account/route.ts) only
// fires going forward on new signups, so every account created
// before it shipped never made it into the CRM. This route closes
// that gap once, and can be re-run safely afterward (e.g. after
// restoring an old backup, or if a run gets interrupted) because it
// skips any account whose owner email already has a Lead.
//
// Query param `dryRun=1` computes and returns the same summary
// without creating anything or hitting the dedupe-search endpoint's
// write path — safe to run first to see what a real run would do.
//
// Per-account failures (missing owner email, Zoho API error, etc.)
// are collected and skipped rather than aborting the whole run —
// one bad account shouldn't block the other 40.
// ============================================================

import { NextResponse } from "next/server";

import { requirePlatformAdmin, logPlatformAdminAction } from "@/lib/auth/platform-admin";
import { toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createZohoLeadFromAccount, findZohoLeadIdByEmail } from "@/lib/crm/zoho-lead";
import type { SubscriptionStatus } from "@/lib/billing-platform/plans";

interface AccountRow {
  id: string;
  name: string | null;
  owner_user_id: string | null;
  plan: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  phone: string | null;
  website: string | null;
  specialty: string | null;
  country: string | null;
  created_at: string;
}

/** Days since an ISO date — same helper shape as admin/accounts/page.tsx. */
function daysSince(dateIso: string): number {
  return (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Maps an account's real DB state to the Lead Status proposed in the
 * MOFU→BOFU plan (section 11.4) — 'Trial en Riesgo' when there's no
 * recent real login, otherwise 'Trial Nuevo'. There's no in-app
 * activation-checklist signal in the accounts table itself, so this
 * can't distinguish 'Trial Activado' from 'Trial Nuevo' — that split
 * needs the PostHog event, not this backfill.
 *
 * These exact strings must already exist as Lead Status picklist
 * options in Zoho (Setup → Customization → Leads → Lead Status) —
 * this route doesn't create picklist values, only assigns them.
 */
function computeLeadStatus(account: AccountRow, lastActiveAt: string | null): string {
  switch (account.subscription_status) {
    case "trial_expired":
      return "Trial Vencido";
    case "canceled":
      return "Cancelado";
    case "suspended":
      return "Suspendida (admin)";
    case "active":
    case "past_due":
      return "Cliente Activo";
    case "trialing":
    default:
      return lastActiveAt && daysSince(lastActiveAt) <= 7 ? "Trial Nuevo" : "Trial en Riesgo";
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePlatformAdmin();

    const limit = checkRateLimit(`platformAdmin:zohoCrmBackfill:${admin.userId}`, RATE_LIMITS.adminAction);
    if (!limit.success) return rateLimitResponse(limit);

    const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

    const db = supabaseAdmin();

    const { data: accounts, error: accountsErr } = await db
      .from("accounts")
      .select("id, name, owner_user_id, plan, subscription_status, trial_ends_at, phone, website, specialty, country, created_at");
    if (accountsErr) {
      console.error("[POST .../zoho-crm/backfill-leads] accounts fetch error:", accountsErr);
      return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 });
    }

    const { data: profiles, error: profilesErr } = await db
      .from("profiles")
      .select("account_id, user_id, full_name, email, account_role");
    if (profilesErr) {
      console.error("[POST .../zoho-crm/backfill-leads] profiles fetch error:", profilesErr);
      return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 });
    }

    const { data: loginEvents, error: loginEventsErr } = await db
      .from("login_events")
      .select("account_id, created_at")
      .eq("is_impersonation", false)
      .not("account_id", "is", null)
      .order("created_at", { ascending: false });
    if (loginEventsErr) {
      console.error("[POST .../zoho-crm/backfill-leads] login_events fetch error:", loginEventsErr);
      return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 });
    }

    const lastActiveByAccount = new Map<string, string>();
    for (const event of loginEvents ?? []) {
      if (!event.account_id || lastActiveByAccount.has(event.account_id)) continue;
      lastActiveByAccount.set(event.account_id, event.created_at);
    }

    let created = 0;
    let skippedExisting = 0;
    let skippedNoEmail = 0;
    const preview: { accountId: string; accountName: string; ownerEmail: string; leadStatus: string; action: string }[] = [];
    const errors: { accountId: string; accountName: string | null; message: string }[] = [];

    for (const account of (accounts ?? []) as AccountRow[]) {
      const owner = (profiles ?? []).find(
        (p) => p.account_id === account.id && (p.user_id === account.owner_user_id || p.account_role === "owner"),
      );
      const ownerEmail = owner?.email ?? null;
      if (!ownerEmail) {
        skippedNoEmail++;
        continue;
      }

      const leadStatus = computeLeadStatus(account, lastActiveByAccount.get(account.id) ?? null);
      const accountName = account.name ?? "Cuenta sin nombre";

      try {
        const existingLeadId = await findZohoLeadIdByEmail(ownerEmail);
        if (existingLeadId) {
          skippedExisting++;
          if (dryRun) preview.push({ accountId: account.id, accountName, ownerEmail, leadStatus, action: "ya existe en CRM" });
          continue;
        }

        if (dryRun) {
          preview.push({ accountId: account.id, accountName, ownerEmail, leadStatus, action: "se crearía" });
          continue;
        }

        await createZohoLeadFromAccount({
          accountId: account.id,
          accountName,
          ownerEmail,
          ownerFullName: owner?.full_name ?? null,
          phone: account.phone,
          website: account.website,
          plan: account.plan,
          specialty: account.specialty,
          country: account.country,
          leadStatus,
        });
        created++;
      } catch (err) {
        errors.push({
          accountId: account.id,
          accountName: account.name,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (!dryRun) {
      await logPlatformAdminAction({
        adminUserId: admin.userId,
        adminEmail: admin.email,
        action: "zoho_crm_backfill",
        metadata: {
          totalAccounts: (accounts ?? []).length,
          created,
          skippedExisting,
          skippedNoEmail,
          errorCount: errors.length,
        },
      });
    }

    return NextResponse.json({
      dryRun,
      totalAccounts: (accounts ?? []).length,
      created,
      skippedExisting,
      skippedNoEmail,
      errors,
      preview: dryRun ? preview : undefined,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
