import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { timingSafeSecretEqual } from "@/lib/cron/verify-secret";
import { resolveFeatureAccess, type FeatureOverrides } from "@/lib/billing-platform/features";
import type { Plan } from "@/lib/billing-platform/plans";
import { isWithinBusinessHoursNow } from "@/lib/scheduling/business-hours";

/**
 * GET /api/conversation-reminders/cron
 *
 * Pensado para dispararse en agenda (cada minuto), igual que
 * /api/appointment-reminders/cron. Requiere el header `x-cron-secret` =
 * CONVERSATION_REMINDERS_CRON_SECRET.
 *
 * Recorre las conversaciones con el "reloj" de recordatorio abierto
 * (tabla conversation_reminders, migración 089), y por cada una que venza
 * su intervalo de escalado inserta una notificación in-app (que a su vez
 * dispara el push FCM por el webhook notifications→push existente).
 *
 * Curva de escalado (minutos entre recordatorios, por reminder_count):
 *   0→5, 1→10, 2→20, 3→40, 4+→60 (cada hora, indefinido).
 *
 * Feature premium (Profesional+): solo se envían recordatorios para cuentas
 * cuyo plan/override habilita `conversation_reminders`.
 *
 * Destinatarios: si la conversación tiene agente asignado, solo a él; si
 * no, a todos los miembros de la cuenta con rol distinto de 'viewer'.
 *
 * El reloj se detiene (fila borrada por trigger) cuando un agente humano
 * responde o se cierra la conversación.
 *
 * Regla nocturna: fuera del horario de la clínica (accounts.timezone +
 * business_hours) se suprimen los tramos cortos — solo se dispara el
 * recordatorio horario. Si la cuenta no tiene horarios configurados, se
 * trata como abierta 24/7 (curva completa).
 */

const GAP_MINUTES = [5, 10, 20, 40];
const HOURLY_MIN = 60;
function gapMinutes(count: number): number {
  return GAP_MINUTES[count] ?? HOURLY_MIN;
}

interface ReminderRow {
  conversation_id: string;
  account_id: string;
  pending_since: string;
  reminder_count: number;
  last_reminder_at: string | null;
}

export async function GET(request: Request) {
  const expected = process.env.CONVERSATION_REMINDERS_CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "cron not configured" }, { status: 503 });
  }
  if (!timingSafeSecretEqual(request.headers.get("x-cron-secret"), expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const now = Date.now();
  const cutoffIso = new Date(now - GAP_MINUTES[0] * 60_000).toISOString();

  const { data: rows, error } = await admin
    .from("conversation_reminders")
    .select("conversation_id, account_id, pending_since, reminder_count, last_reminder_at")
    .or(`last_reminder_at.lte.${cutoffIso},and(last_reminder_at.is.null,pending_since.lte.${cutoffIso})`)
    .order("pending_since", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[conversation-reminders] fetch error:", error);
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }

  // Cache de "¿la cuenta tiene la feature premium?" por cuenta en esta corrida.
  const entitledCache = new Map<string, boolean>();
  async function accountEntitled(accountId: string): Promise<boolean> {
    const cached = entitledCache.get(accountId);
    if (cached !== undefined) return cached;
    const { data: account } = await admin
      .from("accounts")
      .select("plan, feature_overrides")
      .eq("id", accountId)
      .maybeSingle<{ plan: Plan; feature_overrides: FeatureOverrides | null }>();
    const ok = account
      ? resolveFeatureAccess(account.plan, "conversation_reminders", account.feature_overrides)
      : false;
    entitledCache.set(accountId, ok);
    return ok;
  }

  // Cache de "¿la cuenta está abierta ahora?" por cuenta en esta corrida.
  const openCache = new Map<string, boolean>();
  async function accountOpenNow(accountId: string): Promise<boolean> {
    const cached = openCache.get(accountId);
    if (cached !== undefined) return cached;
    const { open } = await isWithinBusinessHoursNow(admin, accountId, new Date(now));
    openCache.set(accountId, open);
    return open;
  }

  let processed = 0;
  let notified = 0;

  for (const row of (rows ?? []) as ReminderRow[]) {
    try {
      const lastEvent = new Date(row.last_reminder_at ?? row.pending_since).getTime();
      const elapsedMin = (now - lastEvent) / 60_000;

      let requiredMin = gapMinutes(row.reminder_count);
      // Regla nocturna: fuera de horario, solo el recordatorio horario.
      if (!(await accountOpenNow(row.account_id))) {
        requiredMin = Math.max(requiredMin, HOURLY_MIN);
      }
      if (elapsedMin < requiredMin) continue;

      // Gate premium por cuenta.
      if (!(await accountEntitled(row.account_id))) continue;

      const { data: conversation } = await admin
        .from("conversations")
        .select("id, account_id, contact_id, status, assigned_agent_id")
        .eq("id", row.conversation_id)
        .maybeSingle<{
          id: string;
          account_id: string;
          contact_id: string | null;
          status: string;
          assigned_agent_id: string | null;
        }>();

      if (!conversation || conversation.status === "closed") {
        await admin.from("conversation_reminders").delete().eq("conversation_id", row.conversation_id);
        continue;
      }

      // Reclama primero (dedup ante corridas superpuestas).
      await admin
        .from("conversation_reminders")
        .update({
          reminder_count: row.reminder_count + 1,
          last_reminder_at: new Date(now).toISOString(),
          updated_at: new Date(now).toISOString(),
        })
        .eq("conversation_id", row.conversation_id);

      let contactName: string | null = null;
      if (conversation.contact_id) {
        const { data: contact } = await admin
          .from("contacts")
          .select("name, phone")
          .eq("id", conversation.contact_id)
          .maybeSingle<{ name: string | null; phone: string | null }>();
        contactName = contact?.name || contact?.phone || null;
      }

      const waitingMin = Math.max(1, Math.round((now - new Date(row.pending_since).getTime()) / 60_000));
      const waitText = waitingMin >= 60 ? `${Math.floor(waitingMin / 60)} h` : `${waitingMin} min`;

      const title = "Conversación sin responder";
      const bodyText =
        `${contactName ?? "Un contacto"} lleva ${waitText} esperando respuesta` +
        (row.reminder_count > 0 ? ` (recordatorio ${row.reminder_count + 1})` : "");

      const recipientIds = new Set<string>();
      if (conversation.assigned_agent_id) {
        recipientIds.add(conversation.assigned_agent_id);
      } else {
        const { data: members } = await admin
          .from("profiles")
          .select("user_id, account_role")
          .eq("account_id", conversation.account_id)
          .neq("account_role", "viewer");
        for (const mm of (members ?? []) as { user_id: string }[]) recipientIds.add(mm.user_id);
      }

      for (const userId of recipientIds) {
        await admin.from("notifications").insert({
          account_id: conversation.account_id,
          user_id: userId,
          type: "response_reminder",
          conversation_id: conversation.id,
          contact_id: conversation.contact_id,
          title,
          body: bodyText,
        });
        notified++;
      }
      processed++;
    } catch (err) {
      console.error("[conversation-reminders] row failed:", row.conversation_id, err);
    }
  }

  return NextResponse.json({ ok: true, scanned: rows?.length ?? 0, processed, notified });
}
