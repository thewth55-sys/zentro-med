// ============================================================
// POST /api/internal/webhooks/new-account
//
// Receives a Supabase Database Webhook fired on INSERT into
// `accounts` (configured in the Supabase Dashboard → Database →
// Webhooks — not a SQL migration, since that lets the secret live in
// project config instead of a committed file) and:
//   1. emails every current platform admin that a new account was created.
//   2. emails the new account's owner a welcome message (this is the
//      only place that fires exactly once per signup — safer than
//      hooking into /auth/callback, which is shared with password
//      reset and platform-admin impersonation).
//
// Auth: a static shared secret in the `x-webhook-secret` header,
// compared timing-safe against NEW_ACCOUNT_WEBHOOK_SECRET — same
// pattern as the cron routes (lib/cron/verify-secret.ts), reused here
// since a Database Webhook has no per-request signature the way
// Stripe/Cal.com do.
// ============================================================

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { timingSafeSecretEqual } from "@/lib/cron/verify-secret";
import { dispatchPlatformWebhookEvent } from "@/lib/webhooks/deliver";
import { sendEmail } from "@/lib/email/resend-client";
import { createZohoLeadFromAccount } from "@/lib/crm/zoho-lead";
import { logIntegrationError } from "@/lib/integration-errors/log";
import {
  renderShellEmail,
  internoShell,
  escapeHtml,
  pText,
  pTabla,
  pEnlace,
  pBoton,
  pNota,
} from "@/lib/email/branded-template";

const PLAN_LABEL: Record<string, string> = {
  trial: "Prueba",
  esencial: "Esencial",
  profesional: "Profesional",
  clinica: "Clínica",
};

export async function POST(request: Request) {
  const expected = process.env.NEW_ACCOUNT_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const supplied = request.headers.get("x-webhook-secret");
  if (!timingSafeSecretEqual(supplied, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const record = body?.record;
  if (body?.type !== "INSERT" || body?.table !== "accounts" || !record?.id) {
    // Not an error — a misconfigured webhook (wrong table/event) is a
    // dashboard setup mistake, not something to retry-storm over.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const db = supabaseAdmin();

  const { data: admins } = await db.from("platform_admins").select("user_id");
  const recipientEmails = (
    await Promise.all(
      (admins ?? []).map(async (row) => {
        const { data } = await db.auth.admin.getUserById(row.user_id);
        return data?.user?.email ?? null;
      }),
    )
  ).filter((email): email is string => !!email);

  let ownerEmail: string | null = null;
  let ownerFullName: string | null = null;
  if (record.owner_user_id) {
    const { data } = await db.auth.admin.getUserById(record.owner_user_id);
    ownerEmail = data?.user?.email ?? null;

    const { data: profileRow } = await db
      .from("profiles")
      .select("full_name")
      .eq("user_id", record.owner_user_id)
      .maybeSingle();
    ownerFullName = profileRow?.full_name ?? null;
  }

  const planLabel = PLAN_LABEL[record.plan as string] ?? record.plan ?? "—";
  const accountName = typeof record.name === "string" ? record.name : "Cuenta nueva";

  await dispatchPlatformWebhookEvent(db, record.id, "account.created", {
    email: ownerEmail,
    name: accountName,
  });

  // Push every new signup into Zoho CRM as a Lead — the commercial
  // funnel's only source of trials right now is this table, and this
  // is the one place a new account is guaranteed to pass through
  // exactly once (see file header). No-ops silently if Zoho CRM
  // credentials aren't configured yet (see src/lib/crm/zoho-lead.ts);
  // any other failure is logged, never allowed to fail the webhook.
  try {
    await createZohoLeadFromAccount({
      accountId: record.id,
      accountName,
      ownerEmail,
      ownerFullName,
      phone: typeof record.phone === "string" ? record.phone : null,
      website: typeof record.website === "string" ? record.website : null,
      plan: typeof record.plan === "string" ? record.plan : null,
      specialty: typeof record.specialty === "string" ? record.specialty : null,
      country: typeof record.country === "string" ? record.country : null,
    });
  } catch (err) {
    console.error("[POST /api/internal/webhooks/new-account] Zoho CRM lead creation failed:", err);
    await logIntegrationError(db, {
      accountId: record.id,
      source: "zoho_crm_lead",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  let sentAdminAlert = false;
  if (recipientEmails.length > 0) {
    try {
      await sendEmail({
        to: recipientEmails,
        subject: `Nueva cuenta: ${accountName}`,
        html: renderShellEmail({
          shell: internoShell(accountName, { sub: "Panel de plataforma" }),
          heading: "Nueva cuenta registrada",
          footerNote: "Notificación para administradores de Zentro Labs.",
          blocks: [
            pText("Se registró una cuenta nueva en Zentro Med."),
            pTabla([
              { k: "Cuenta", v: escapeHtml(accountName) },
              { k: "Dueño", v: escapeHtml(ownerEmail ?? "—") },
              { k: "Plan", v: escapeHtml(planLabel) },
            ]),
            pEnlace("Ver en el panel de admin →", `https://med.zentrolabs.com/admin/accounts/${escapeHtml(record.id)}`),
          ],
        }),
      });
      sentAdminAlert = true;
    } catch (err) {
      // Same "never break the caller" posture as notifyAccountTeam — a
      // failed internal alert must not turn into a 500 the Database
      // Webhook then retries indefinitely.
      console.error("[POST /api/internal/webhooks/new-account] admin alert send failed:", err);
    }
  }

  let sentWelcome = false;
  if (ownerEmail) {
    try {
      await sendEmail({
        to: ownerEmail,
        subject: "Empecemos con tu consultorio — Zentro Med",
        html: renderShellEmail({
          shell: internoShell(accountName, { sub: "Primeros pasos", chip: null }),
          heading: "Tu cuenta está lista",
          footerNote: "Este es un correo automático de Zentro Med, no es necesario responder.",
          blocks: [
            pText("Ya puedes entrar. Para que el sistema te sirva desde esta semana, estos tres pasos son los que más rinden:"),
            pTabla([
              { k: "Paso 1", v: "Conecta tu WhatsApp · 5 min" },
              { k: "Paso 2", v: "Carga tus tratamientos y precios · 10 min" },
              { k: "Paso 3", v: "Comparte tu página de reserva · 1 min" },
            ]),
            pBoton("Empezar la configuración", "https://med.zentrolabs.com/inicio"),
            pText("Si prefieres que lo hagamos por ti, tu estratega te llama y lo deja listo en 24 horas."),
            pEnlace("Agendar mi llamada de configuración →", "https://med.zentrolabs.com/onboarding"),
            pNota("Tienes 30 días de prueba con WhatsApp y Zen incluidos. No pedimos tarjeta."),
          ],
        }),
      });
      sentWelcome = true;
    } catch (err) {
      console.error("[POST /api/internal/webhooks/new-account] welcome email send failed:", err);
    }
  }

  return NextResponse.json({ ok: true, sentAdminAlert, sentWelcome, recipients: recipientEmails.length });
}
