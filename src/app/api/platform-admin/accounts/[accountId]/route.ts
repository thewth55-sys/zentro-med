// ============================================================
// GET /api/platform-admin/accounts/[accountId] — the "Cuenta 360"
// detail feed: account/plan info, internal team members, and Stripe
// payment history. Same service-role + requirePlatformAdmin() gate
// as every other /api/platform-admin/** route.
// ============================================================

import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { getStripeClient } from "@/lib/billing-platform/stripe";

export async function GET(_request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    await requirePlatformAdmin();
    const { accountId } = await params;

    const db = supabaseAdmin();

    const { data: account, error: accountErr } = await db
      .from("accounts")
      .select(
        "id, name, owner_user_id, plan, subscription_status, trial_ends_at, included_seats, stripe_customer_id, created_at",
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
      .select("user_id, full_name, email, account_role")
      .eq("account_id", accountId)
      .order("account_role", { ascending: true });

    if (membersErr) {
      console.error("[GET /api/platform-admin/accounts/:id] members fetch error:", membersErr);
      return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
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
        createdAt: account.created_at,
      },
      members: (members ?? []).map((m) => ({
        userId: m.user_id,
        fullName: m.full_name,
        email: m.email,
        role: m.account_role,
      })),
      payments,
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
