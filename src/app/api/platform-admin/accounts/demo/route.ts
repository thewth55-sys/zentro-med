// ============================================================
// POST /api/platform-admin/accounts/demo
//
// Lets a platform admin spin up a fully-seeded demo account —
// contacts, WhatsApp-style conversations, patient profiles, and a
// populated agenda (see lib/admin/demo-seed.ts) — so they can give a
// live product demo via the existing "Impersonar" action instead of
// showing an empty dashboard. No email is actually invited; the
// owner user is created directly via the admin API with a
// non-deliverable internal address purely so the existing
// handle_new_user() trigger (and impersonate, which needs a real
// auth.users + profiles row) work completely unmodified.
// ============================================================

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { requirePlatformAdmin, logPlatformAdminAction } from "@/lib/auth/platform-admin";
import { toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { seedDemoAccountData } from "@/lib/admin/demo-seed";
import type { Plan } from "@/lib/billing-platform/plans";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const VALID_PLANS: Plan[] = ["trial", "esencial", "profesional", "clinica"];

export async function POST(request: Request) {
  try {
    const adminCtx = await requirePlatformAdmin();

    const limit = checkRateLimit(
      `platformAdmin:createDemo:${adminCtx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as
      | { name?: unknown; plan?: unknown }
      | null;

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "'name' es obligatorio" }, { status: 400 });
    }
    const plan = (typeof body?.plan === "string" ? body.plan : "clinica") as Plan;
    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const demoEmail = `demo-${randomUUID().slice(0, 8)}@internal.zentrolabs.com`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: demoEmail,
      email_confirm: true,
      user_metadata: { full_name: "Cuenta demo", brand_name: name },
    });
    if (createErr || !created?.user) {
      console.error("[POST .../accounts/demo] createUser error:", createErr);
      return NextResponse.json(
        { error: "No se pudo crear el usuario dueño de la demo" },
        { status: 500 },
      );
    }

    const { data: account, error: accountErr } = await admin
      .from("accounts")
      .select("id")
      .eq("owner_user_id", created.user.id)
      .maybeSingle();
    if (accountErr || !account) {
      console.error("[POST .../accounts/demo] account lookup error:", accountErr);
      return NextResponse.json(
        { error: "El usuario se creó pero la cuenta no se inicializó — revisa el trigger handle_new_user" },
        { status: 500 },
      );
    }

    const { error: planErr } = await admin
      .from("accounts")
      .update({ plan })
      .eq("id", account.id);
    if (planErr) {
      console.error("[POST .../accounts/demo] plan update error:", planErr);
      return NextResponse.json({ error: "No se pudo asignar el plan" }, { status: 500 });
    }

    const { error: tagErr } = await admin
      .from("account_tags")
      .insert({ account_id: account.id, label: "Demo", created_by: adminCtx.userId });
    if (tagErr) {
      // Non-fatal — the account is otherwise fully usable without the tag.
      console.error("[POST .../accounts/demo] tag insert error:", tagErr);
    }

    try {
      await seedDemoAccountData(admin, { accountId: account.id, ownerUserId: created.user.id });
    } catch (seedErr) {
      console.error("[POST .../accounts/demo] seed error:", seedErr);
      return NextResponse.json(
        { error: "La cuenta se creó pero no se pudieron cargar los datos demo" },
        { status: 500 },
      );
    }

    await logPlatformAdminAction({
      adminUserId: adminCtx.userId,
      adminEmail: adminCtx.email,
      action: "create_demo_account",
      targetAccountId: account.id,
      targetUserId: created.user.id,
      metadata: { accountName: name, plan },
    });

    return NextResponse.json({ accountId: account.id, ownerEmail: demoEmail });
  } catch (err) {
    return toErrorResponse(err);
  }
}
