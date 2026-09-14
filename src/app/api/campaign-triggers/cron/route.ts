// ============================================================
// GET /api/campaign-triggers/cron
//
// Computes, once a day, which accounts just crossed one of 6
// lifecycle-marketing trigger conditions (see the reviewed campaign
// mockup — reactivation/incentive email sequence) and fires the
// matching outbound webhook event so an external tool (Zoho Flow →
// Zoho Campaigns) can send the actual email. This route never sends
// email itself — Zentro Med only computes "when," per
// src/lib/webhooks/events.ts's campaign_trigger.* entries.
//
// Same shape as every other cron here (billing-platform/cron,
// appointment-reminders/cron): shared-secret header, service-role
// client, loop-with-try/catch per account so one failure doesn't
// stop the rest. Idempotency is a table (campaign_trigger_events)
// instead of a single guard column, since there are several
// independent triggers per account with different "don't repeat for
// N days" windows (null = fire at most once ever).
// ============================================================

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { timingSafeSecretEqual } from "@/lib/cron/verify-secret";
import { dispatchPlatformWebhookEvent } from "@/lib/webhooks/deliver";
import type { WebhookEvent } from "@/lib/webhooks/events";

type Db = ReturnType<typeof supabaseAdmin>;

const DAY_MS = 24 * 60 * 60 * 1000;
const STALLED_QUOTE_DAYS = 14;
const CASH_PAYMENTS_THRESHOLD = 3;
const FIRST_MONTH_DAYS = 30;

/** How long to wait before firing the same trigger again for the same account. `null` = at most once ever. */
const NO_REPEAT_DAYS: Record<WebhookEvent, number | null> = {
  "message.received": null, // unused here, not a campaign_trigger.* event
  "message.status_updated": null,
  "conversation.created": null,
  "campaign_trigger.dormant_login_7d": 30,
  "campaign_trigger.dormant_login_75d": null, // positioned as the last automated nudge — never repeat
  "campaign_trigger.stalled_quotes_14d": STALLED_QUOTE_DAYS,
  "campaign_trigger.zen_off_manual_replies": 30,
  "campaign_trigger.cash_payments_weekly": 7,
  "campaign_trigger.first_month_milestone": null,
  "account.created": null, // unused here, dispatched from the new-account webhook instead
};

async function alreadyFiredRecently(db: Db, accountId: string, trigger: WebhookEvent): Promise<boolean> {
  const windowDays = NO_REPEAT_DAYS[trigger];
  let query = db.from("campaign_trigger_events").select("id").eq("account_id", accountId).eq("trigger_key", trigger);
  if (windowDays !== null) {
    query = query.gte("fired_at", new Date(Date.now() - windowDays * DAY_MS).toISOString());
  }
  const { data } = await query.limit(1).maybeSingle();
  return !!data;
}

interface Owner {
  email: string | null;
  name: string | null;
}

async function fire(
  db: Db,
  accountId: string,
  trigger: WebhookEvent,
  owner: Owner,
  data: Record<string, unknown>
): Promise<void> {
  if (await alreadyFiredRecently(db, accountId, trigger)) return;
  // The external tool (Zoho Flow → Zoho Campaigns) matches contacts by
  // email, so every campaign_trigger.* payload carries the account
  // owner's email/name alongside its own data — same shape as
  // account.created's payload in the new-account webhook.
  await dispatchPlatformWebhookEvent(db, accountId, trigger, { email: owner.email, name: owner.name, ...data });
  await db.from("campaign_trigger_events").insert({ account_id: accountId, trigger_key: trigger });
}

// ------------------------------------------------------------
// Per-trigger checks — each is independent and never throws; the
// caller wraps every account in try/catch anyway, but keeping these
// self-contained makes it easy to add/remove a trigger later.
// ------------------------------------------------------------

async function checkDormantLogin(db: Db, accountId: string, owner: Owner): Promise<void> {
  const { data: lastLogin } = await db
    .from("login_events")
    .select("created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastLogin) return; // no login history at all — can't measure dormancy, skip rather than guess

  const daysSince = Math.floor((Date.now() - new Date(lastLogin.created_at).getTime()) / DAY_MS);
  if (daysSince < 7) return;

  const [{ count: contactsCount }, { count: conversationsCount }] = await Promise.all([
    db.from("contacts").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    db.from("conversations").select("id", { count: "exact", head: true }).eq("account_id", accountId),
  ]);
  const payload = { daysSinceLogin: daysSince, contactsCount: contactsCount ?? 0, conversationsCount: conversationsCount ?? 0 };

  if (daysSince >= 75) {
    await fire(db, accountId, "campaign_trigger.dormant_login_75d", owner, payload);
  } else {
    await fire(db, accountId, "campaign_trigger.dormant_login_7d", owner, payload);
  }
}

async function checkStalledQuotes(db: Db, accountId: string, owner: Owner): Promise<void> {
  const cutoff = new Date(Date.now() - STALLED_QUOTE_DAYS * DAY_MS).toISOString();
  const { data: stalled } = await db
    .from("quotes")
    .select("total, updated_at, contact:contacts(name)")
    .eq("account_id", accountId)
    .eq("status", "sent")
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true });

  if (!stalled || stalled.length === 0) return;

  const totalValue = stalled.reduce((sum, q) => sum + Number(q.total), 0);
  const topThree = stalled.slice(0, 3).map((q) => {
    const contact = Array.isArray(q.contact) ? q.contact[0] : q.contact;
    return {
      name: contact?.name ?? null,
      amount: Number(q.total),
      daysAgo: Math.floor((Date.now() - new Date(q.updated_at).getTime()) / DAY_MS),
    };
  });

  // Flat example1Name/example1Amount/example1DaysAgo/... fields instead
  // of an array — the external tool (Zoho Flow) can only map named
  // fields, not index into a JSON array, so a fixed 3-slot shape is
  // what it can actually consume.
  const exampleFields: Record<string, unknown> = {};
  topThree.forEach((ex, i) => {
    exampleFields[`example${i + 1}Name`] = ex.name;
    exampleFields[`example${i + 1}Amount`] = ex.amount;
    exampleFields[`example${i + 1}DaysAgo`] = ex.daysAgo;
  });

  await fire(db, accountId, "campaign_trigger.stalled_quotes_14d", owner, {
    count: stalled.length,
    totalValue,
    ...exampleFields,
  });
}

async function checkZenOff(db: Db, accountId: string, owner: Owner): Promise<void> {
  const { data: waConfig } = await db.from("whatsapp_config").select("status").eq("account_id", accountId).maybeSingle();
  if (waConfig?.status !== "connected") return; // no point nudging to enable Zen if WhatsApp itself isn't connected

  const { data: aiConfig } = await db
    .from("ai_configs")
    .select("is_active, auto_reply_enabled")
    .eq("account_id", accountId)
    .maybeSingle();
  const zenOn = aiConfig?.is_active && aiConfig?.auto_reply_enabled;
  if (zenOn) return;

  const { data: conversationRows } = await db.from("conversations").select("id").eq("account_id", accountId);
  const conversationIds = (conversationRows ?? []).map((c) => c.id);
  if (conversationIds.length === 0) return;

  const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const { count: manualReplies } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .eq("sender_type", "agent")
    .gte("created_at", weekAgo);

  // Only worth nudging if there's real manual-reply volume this week —
  // an account with 1-2 replies isn't feeling the pain this email describes.
  if (!manualReplies || manualReplies < 10) return;

  await fire(db, accountId, "campaign_trigger.zen_off_manual_replies", owner, { manualRepliesCount: manualReplies });
}

async function checkCashPayments(db: Db, accountId: string, owner: Owner): Promise<void> {
  const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const { data: cashPayments } = await db
    .from("payments")
    .select("amount")
    .eq("account_id", accountId)
    .eq("method", "cash")
    .gte("created_at", weekAgo);

  if (!cashPayments || cashPayments.length < CASH_PAYMENTS_THRESHOLD) return;

  const totalAmount = cashPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  await fire(db, accountId, "campaign_trigger.cash_payments_weekly", owner, { count: cashPayments.length, totalAmount });
}

async function checkFirstMonthMilestone(
  db: Db,
  accountId: string,
  accountCreatedAt: string,
  owner: Owner
): Promise<void> {
  const daysSinceCreated = Math.floor((Date.now() - new Date(accountCreatedAt).getTime()) / DAY_MS);
  if (daysSinceCreated < FIRST_MONTH_DAYS) return;

  const monthAgo = new Date(Date.now() - FIRST_MONTH_DAYS * DAY_MS).toISOString();
  const [{ data: appointments }, { data: payments }] = await Promise.all([
    db.from("appointments").select("status").eq("account_id", accountId).gte("start_at", monthAgo),
    db.from("payments").select("amount").eq("account_id", accountId).gte("paid_at", monthAgo),
  ]);

  const appointmentsCount = appointments?.length ?? 0;
  const noShowCount = (appointments ?? []).filter((a) => a.status === "no_show" || a.status === "cancelled").length;
  const noShowRate = appointmentsCount > 0 ? noShowCount / appointmentsCount : 0;
  const revenueCollected = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  await fire(db, accountId, "campaign_trigger.first_month_milestone", owner, {
    appointmentsCount,
    noShowRate,
    revenueCollected,
  });
}

export async function GET(request: Request) {
  const expected = process.env.CAMPAIGN_TRIGGERS_CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "cron not configured" }, { status: 503 });
  }
  const supplied = request.headers.get("x-cron-secret");
  if (!timingSafeSecretEqual(supplied, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: accounts, error } = await db
    .from("accounts")
    .select("id, created_at, owner_user_id")
    .eq("is_demo", false)
    .in("subscription_status", ["trialing", "active", "past_due"]);

  if (error) {
    console.error("[campaign-triggers cron] accounts query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Batch-resolve every owner's email/name once — the external tool
  // (Zoho Flow → Zoho Campaigns) matches contacts by email, so every
  // campaign_trigger.* payload needs it (see `fire()`).
  const ownerUserIds = [...new Set((accounts ?? []).map((a) => a.owner_user_id))];
  const { data: owners } = await db.from("profiles").select("user_id, email, full_name").in("user_id", ownerUserIds);
  const ownerByUserId = new Map((owners ?? []).map((o) => [o.user_id, { email: o.email, name: o.full_name }]));

  let checked = 0;
  for (const account of accounts ?? []) {
    checked += 1;
    const owner = ownerByUserId.get(account.owner_user_id) ?? { email: null, name: null };
    try {
      await checkDormantLogin(db, account.id, owner);
      await checkStalledQuotes(db, account.id, owner);
      await checkZenOff(db, account.id, owner);
      await checkCashPayments(db, account.id, owner);
      await checkFirstMonthMilestone(db, account.id, account.created_at, owner);
    } catch (err) {
      console.error(`[campaign-triggers cron] failed for account ${account.id}:`, err);
    }
  }

  return NextResponse.json({ checked });
}
