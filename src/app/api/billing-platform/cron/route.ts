import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { timingSafeSecretEqual } from "@/lib/cron/verify-secret";
import { sendEmail } from "@/lib/email/resend-client";
import { renderShellEmail, internoShell, escapeHtml, pText, pDestacado, pTabla, pBoton, pNota } from "@/lib/email/branded-template";

const PLAN_LABEL: Record<string, string> = {
  trial: "Prueba de 30 días",
  esencial: "Esencial",
  profesional: "Profesional",
  clinica: "Clínica",
};

/**
 * Emails the account owner once when their trial is 4-5 days from
 * ending — guarded by `trial_ending_email_sent_at` so a daily cron
 * run never re-sends it. Usage stats are trimmed to what's cheap to
 * query directly (appointments booked, amount collected) — no
 * message-count/AI-usage stat, unlike the reviewed mockup, since no
 * cheap existing count for that exists yet.
 */
async function sendTrialEndingEmails(admin: ReturnType<typeof supabaseAdmin>): Promise<number> {
  const now = Date.now();
  const windowStart = new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString();

  const { data: accounts, error } = await admin
    .from("accounts")
    .select("id, name, plan, trial_ends_at, default_currency, created_at")
    .eq("subscription_status", "trialing")
    .gte("trial_ends_at", windowStart)
    .lt("trial_ends_at", windowEnd)
    .is("trial_ending_email_sent_at", null);

  if (error) {
    console.error("[billing-platform cron] trial-ending query error:", error);
    return 0;
  }
  if (!accounts || accounts.length === 0) return 0;

  let sent = 0;
  for (const account of accounts) {
    try {
      const { data: owner } = await admin
        .from("profiles")
        .select("email")
        .eq("account_id", account.id)
        .eq("account_role", "owner")
        .not("email", "is", null)
        .maybeSingle();
      if (!owner?.email) continue;

      const [{ count: appointmentsCount }, { data: payments }] = await Promise.all([
        admin.from("appointments").select("id", { count: "exact", head: true }).eq("account_id", account.id),
        admin.from("payments").select("amount").eq("account_id", account.id),
      ]);
      const totalCollected = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
      const currency = account.default_currency || "USD";
      const amountLabel = new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(totalCollected);
      const endsLabel = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(
        new Date(account.trial_ends_at),
      );

      await sendEmail({
        to: owner.email,
        subject: "Te quedan 5 días de prueba — Zentro Med",
        html: renderShellEmail({
          shell: internoShell(account.name, { sub: "Tu suscripción", chip: null }),
          heading: "Tu prueba termina pronto",
          footerNote: "Este es un correo automático de Zentro Med, no es necesario responder.",
          blocks: [
            pText(`Elige un plan antes de que termine tu prueba para que nada se interrumpa en ${escapeHtml(account.name)}.`),
            pDestacado("LO QUE LLEVAS EN LA PRUEBA", `${appointmentsCount ?? 0} citas · ${amountLabel}`, "Citas agendadas y cobros registrados", "verde"),
            pTabla([
              { k: "Tu plan", v: PLAN_LABEL[account.plan as string] ?? account.plan },
              { k: "Termina", v: endsLabel },
              { k: "Si no eliges", v: "Tu cuenta pasa a solo lectura" },
            ]),
            pBoton("Elegir mi plan", "https://med.zentrolabs.com/settings?tab=billing-platform"),
            pNota("No cobramos nada de forma automática. Tus pacientes, citas y conversaciones se conservan aunque tardes en decidir."),
          ],
        }),
      });

      await admin.from("accounts").update({ trial_ending_email_sent_at: new Date().toISOString() }).eq("id", account.id);
      sent += 1;
    } catch (err) {
      console.error(`[billing-platform cron] trial-ending email failed for account ${account.id}:`, err);
    }
  }

  return sent;
}

/**
 * Marks trial accounts as expired once `trial_ends_at` has passed
 * with no active paid subscription. Meant to run daily (Vercel Cron /
 * external pinger) — same shared-secret pattern as
 * `automations/cron`, via `BILLING_CRON_SECRET`.
 *
 * Only touches `plan = 'trial'` rows still in `subscription_status =
 * 'trialing'` — an account that already checked out during its trial
 * has `subscription_status = 'active'` and is never touched here,
 * even past the original `trial_ends_at` date.
 */
export async function GET(request: Request) {
  const expected = process.env.BILLING_CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "cron not configured" }, { status: 503 });
  }
  const supplied = request.headers.get("x-cron-secret");
  if (!timingSafeSecretEqual(supplied, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();

  const trialEndingSent = await sendTrialEndingEmails(admin);

  const { data, error } = await admin
    .from("accounts")
    .update({ subscription_status: "trial_expired" })
    .eq("plan", "trial")
    .eq("subscription_status", "trialing")
    .lt("trial_ends_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("[billing-platform cron] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired: data?.length ?? 0, trialEndingSent });
}
