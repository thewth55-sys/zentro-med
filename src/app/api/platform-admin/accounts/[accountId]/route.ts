// ============================================================
// GET /api/platform-admin/accounts/[accountId] — the "Cuenta 360"
// detail feed: account/plan info, internal team members, and Stripe
// payment history. Same service-role + requirePlatformAdmin() gate
// as every other /api/platform-admin/** route.
// ============================================================

import { NextResponse } from "next/server";

import { requirePlatformAdmin, resolveAccountOwner, logPlatformAdminAction } from "@/lib/auth/platform-admin";
import { toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { getStripeClient } from "@/lib/billing-platform/stripe";
import { getAiResponseQuotaStatus } from "@/lib/ai/quota";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

/** Deletion is restricted to demo accounts — the ones the "Crear
 *  cuenta demo" flow creates with a synthetic
 *  demo-<id>@internal.zentrolabs.com owner (see
 *  /api/platform-admin/accounts/demo). Real customer accounts are
 *  never deletable from the admin panel, even by a platform admin —
 *  suspending is the only destructive-ish action available for those. */
const DEMO_EMAIL_DOMAIN = "@internal.zentrolabs.com";

export async function GET(_request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    await requirePlatformAdmin();
    const { accountId } = await params;

    const db = supabaseAdmin();

    const { data: account, error: accountErr } = await db
      .from("accounts")
      .select(
        "id, name, owner_user_id, plan, subscription_status, trial_ends_at, included_seats, stripe_customer_id, stripe_subscription_id, created_at, feature_overrides, logo_url, ai_access_blocked, ai_response_limit_override, phone, address, specialty, website, social_links",
      )
      .eq("id", accountId)
      .maybeSingle();

    if (accountErr) {
      console.error("[GET /api/platform-admin/accounts/:id] account fetch error:", accountErr);
      return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
    }
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const { data: members, error: membersErr } = await db
      .from("profiles")
      .select("user_id, full_name, email, phone, license_number, account_role, google_calendar_connected, avatar_url")
      .eq("account_id", accountId)
      .order("account_role", { ascending: true });

    if (membersErr) {
      console.error("[GET /api/platform-admin/accounts/:id] members fetch error:", membersErr);
      return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
    }

    // Never decrypt secrets here — same write-only posture as the
    // account's own Settings UI (MASKED_KEY in ai-config.tsx): the
    // admin panel shows *whether* something is configured, not the
    // value, even partially.
    const { data: aiConfig } = await db
      .from("ai_configs")
      .select("provider, model, is_active, auto_reply_enabled")
      .eq("account_id", accountId)
      .maybeSingle();

    // whatsapp_config is account-scoped (UNIQUE(account_id) since
    // 017_account_sharing.sql) — one connection per account, not per
    // member, despite the `user_id` audit column on the row.
    const { data: whatsappConfig } = await db
      .from("whatsapp_config")
      .select("phone_number_id, waba_id, status, connected_at, registered_at, last_registration_error")
      .eq("account_id", accountId)
      .maybeSingle();

    const { data: conversionConfig } = await db
      .from("conversion_tracking_config")
      .select("meta_pixel_id, meta_track_lead_created, meta_track_deal_won, meta_track_first_reply, meta_track_automations, google_ads_conversion_id")
      .eq("account_id", accountId)
      .maybeSingle();

    const { data: loginEvents } = await db
      .from("login_events")
      .select("user_id, ip_address, browser, device, country, created_at, is_native")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Estado de push por miembro: ¿tiene algún dispositivo (app) registrado
    // para recibir notificaciones? Clave para diagnosticar "no me llegan las
    // notificaciones" — sin token, el push nunca llega aunque la campana sí.
    const memberUserIds = (members ?? []).map((m) => m.user_id as string);
    const pushByUser = new Map<string, { platform: string; updatedAt: string }[]>();
    if (memberUserIds.length > 0) {
      const { data: pushRows } = await db
        .from("push_tokens")
        .select("user_id, platform, updated_at")
        .in("user_id", memberUserIds)
        .order("updated_at", { ascending: false });
      for (const row of pushRows ?? []) {
        const list = pushByUser.get(row.user_id) ?? [];
        list.push({ platform: row.platform as string, updatedAt: row.updated_at as string });
        pushByUser.set(row.user_id, list);
      }
    }

    let payments: {
      id: string;
      status: string;
      amountDue: number;
      amountPaid: number;
      currency: string;
      created: number;
      description: string | null;
      hostedInvoiceUrl: string | null;
    }[] = [];

    if (account.stripe_customer_id) {
      try {
        const stripe = getStripeClient();
        const list = await stripe.invoices.list({ customer: account.stripe_customer_id, limit: 12 });
        payments = list.data
          .filter((inv) => inv.status !== "draft")
          .map((inv) => ({
            id: inv.id ?? "",
            status: inv.status ?? "unknown",
            amountDue: inv.amount_due,
            amountPaid: inv.amount_paid,
            currency: inv.currency,
            created: inv.created,
            description: inv.lines.data[0]?.description ?? null,
            hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
          }));
      } catch (stripeErr) {
        // Stripe outage/misconfig shouldn't 500 the whole detail page —
        // the rest of the account panel is still useful without it.
        console.error("[GET /api/platform-admin/accounts/:id] stripe fetch error:", stripeErr);
      }
    }

    const { data: tags, error: tagsErr } = await db
      .from("account_tags")
      .select("id, label")
      .eq("account_id", accountId)
      .order("created_at", { ascending: true });

    if (tagsErr) {
      console.error("[GET /api/platform-admin/accounts/:id] tags fetch error:", tagsErr);
    }

    const { data: notes, error: notesErr } = await db
      .from("account_notes")
      .select("id, body, author_user_id, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (notesErr) {
      console.error("[GET /api/platform-admin/accounts/:id] notes fetch error:", notesErr);
    }

    const quota = await getAiResponseQuotaStatus(db, accountId);

    const { data: recentErrors, error: errorsErr } = await db
      .from("integration_errors")
      .select("id, source, code, message, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (errorsErr) {
      console.error("[GET /api/platform-admin/accounts/:id] integration_errors fetch error:", errorsErr);
    }

    const authorIds = [...new Set((notes ?? []).map((n) => n.author_user_id).filter(Boolean))] as string[];
    const authorNames = new Map<string, string | null>();
    await Promise.all(
      authorIds.map(async (id) => {
        const { data } = await db.auth.admin.getUserById(id);
        authorNames.set(
          id,
          (data?.user?.user_metadata?.full_name as string | undefined) ?? data?.user?.email ?? null,
        );
      }),
    );

    return NextResponse.json({
      account: {
        id: account.id,
        name: account.name,
        ownerUserId: account.owner_user_id,
        plan: account.plan,
        subscriptionStatus: account.subscription_status,
        trialEndsAt: account.trial_ends_at,
        includedSeats: account.included_seats,
        hasStripeCustomer: !!account.stripe_customer_id,
        hasStripeSubscription: !!account.stripe_subscription_id,
        createdAt: account.created_at,
        featureOverrides: account.feature_overrides ?? {},
        logoUrl: account.logo_url,
        aiAccessBlocked: account.ai_access_blocked,
        aiResponseLimitOverride: account.ai_response_limit_override,
        phone: account.phone,
        address: account.address,
        specialty: account.specialty,
        website: account.website,
        socialLinks: account.social_links,
      },
      aiQuota: quota,
      recentErrors: (recentErrors ?? []).map((e) => ({
        id: e.id,
        source: e.source,
        code: e.code,
        message: e.message,
        createdAt: e.created_at,
      })),
      members: (members ?? []).map((m) => {
        const push = pushByUser.get(m.user_id) ?? [];
        return {
          userId: m.user_id,
          fullName: m.full_name,
          email: m.email,
          phone: m.phone,
          licenseNumber: m.license_number,
          role: m.account_role,
          avatarUrl: m.avatar_url,
          // Notificaciones push: dispositivos (app) registrados por este usuario.
          pushDevices: push.map((p) => p.platform),
          pushLastAt: push[0]?.updatedAt ?? null,
        };
      }),
      payments,
      integrations: {
        ai: aiConfig
          ? {
              provider: aiConfig.provider,
              model: aiConfig.model,
              isActive: aiConfig.is_active,
              autoReplyEnabled: aiConfig.auto_reply_enabled,
            }
          : null,
        whatsapp: whatsappConfig
          ? {
              phoneNumberId: whatsappConfig.phone_number_id,
              wabaId: whatsappConfig.waba_id,
              status: whatsappConfig.status,
              connectedAt: whatsappConfig.connected_at,
              registeredAt: whatsappConfig.registered_at,
              lastRegistrationError: whatsappConfig.last_registration_error,
            }
          : null,
        googleCalendar: (members ?? [])
          .filter((m) => m.google_calendar_connected)
          .map((m) => m.full_name ?? m.email ?? "—"),
        metaCapi: conversionConfig
          ? {
              hasPixelId: !!conversionConfig.meta_pixel_id,
              trackLeadCreated: conversionConfig.meta_track_lead_created,
              trackDealWon: conversionConfig.meta_track_deal_won,
              trackFirstReply: conversionConfig.meta_track_first_reply,
              trackAutomations: conversionConfig.meta_track_automations,
              hasGoogleAdsId: !!conversionConfig.google_ads_conversion_id,
            }
          : null,
      },
      sessions: (loginEvents ?? []).map((s) => {
        const member = (members ?? []).find((m) => m.user_id === s.user_id);
        return {
          memberName: member?.full_name ?? member?.email ?? "—",
          ipAddress: s.ip_address,
          browser: s.browser,
          device: s.device,
          country: s.country,
          createdAt: s.created_at,
          isNative: s.is_native ?? false,
        };
      }),
      tags: (tags ?? []).map((t) => ({ id: t.id, label: t.label })),
      notes: (notes ?? []).map((n) => ({
        id: n.id,
        body: n.body,
        authorName: n.author_user_id ? (authorNames.get(n.author_user_id) ?? null) : null,
        createdAt: n.created_at,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * DELETE /api/platform-admin/accounts/[accountId] — permanently
 * deletes a demo account and every user that belonged to it.
 *
 * Gated to accounts whose OWNER email ends in
 * `@internal.zentrolabs.com` — the domain the demo-account creator
 * stamps on its synthetic owner. Real customer accounts 404 here even
 * for a platform admin; there is no way to delete a paying customer's
 * data from this endpoint.
 *
 * Order matters: `accounts.owner_user_id` is `ON DELETE RESTRICT`
 * against `auth.users`, so the account row must be deleted first
 * (cascading away profiles/contacts/conversations/etc. scoped to it)
 * — only then can the now-unreferenced auth.users rows be deleted,
 * otherwise the owner's user row would block on the account row that
 * still points at it.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    const admin = await requirePlatformAdmin();
    const { accountId } = await params;

    const limit = checkRateLimit(`platformAdmin:delete:${admin.userId}`, RATE_LIMITS.adminAction);
    if (!limit.success) return rateLimitResponse(limit);

    const owner = await resolveAccountOwner(accountId);
    if (!owner) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (!owner.ownerEmail.toLowerCase().endsWith(DEMO_EMAIL_DOMAIN)) {
      return NextResponse.json(
        { error: "Solo se pueden eliminar cuentas demo (@internal.zentrolabs.com)" },
        { status: 403 },
      );
    }

    const db = supabaseAdmin();

    const { data: memberRows } = await db.from("profiles").select("user_id").eq("account_id", accountId);
    const memberUserIds = (memberRows ?? []).map((m) => m.user_id as string);

    const { error: deleteErr } = await db.from("accounts").delete().eq("id", accountId);
    if (deleteErr) {
      console.error("[DELETE /api/platform-admin/accounts/:id] account delete error:", deleteErr);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    // Best-effort — the account (and everything scoped to it) is
    // already gone at this point regardless of whether the auth users
    // themselves clean up successfully.
    for (const userId of memberUserIds) {
      const { error: userDeleteErr } = await db.auth.admin.deleteUser(userId);
      if (userDeleteErr) {
        console.error(`[DELETE /api/platform-admin/accounts/:id] failed to delete auth user ${userId}:`, userDeleteErr);
      }
    }

    await logPlatformAdminAction({
      adminUserId: admin.userId,
      adminEmail: admin.email,
      action: "delete_account",
      targetAccountId: owner.accountId,
      targetUserId: owner.ownerUserId,
      metadata: { accountName: owner.accountName, ownerEmail: owner.ownerEmail },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
