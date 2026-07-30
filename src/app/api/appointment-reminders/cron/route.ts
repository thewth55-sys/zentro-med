import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/appointment-reminders/admin-client';
import { timingSafeSecretEqual } from '@/lib/cron/verify-secret';
import { logIntegrationError } from '@/lib/integration-errors/log';
import {
  sendMessageToConversation,
  SendMessageError,
} from '@/lib/whatsapp/send-message';
import type { ReminderVariableMapping } from '@/types';

/**
 * Drain due `appointment_reminders` rows and send them as WhatsApp
 * template messages. Meant to be hit on a schedule (same external-
 * pinger setup as `/api/automations/cron`) — requires a shared secret
 * via the `x-cron-secret` header matching `APPOINTMENT_REMINDERS_CRON_SECRET`.
 *
 * The claim step (status: pending -> processing) is a simple lock so
 * overlapping invocations don't double-send the same reminder —
 * mirrors `automation_pending_executions`'s claim pattern.
 */
export async function GET(request: Request) {
  const expected = process.env.APPOINTMENT_REMINDERS_CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 });
  }
  const supplied = request.headers.get('x-cron-secret');
  if (!timingSafeSecretEqual(supplied, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: due, error } = await admin
    .from('appointment_reminders')
    .select('id, account_id, appointment_id')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())
    .order('send_at', { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due || due.length === 0) return NextResponse.json({ processed: 0 });

  let sent = 0;
  let failed = 0;
  for (const row of due) {
    const { data: claim } = await admin
      .from('appointment_reminders')
      .update({ status: 'processing' })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (!claim) continue;

    const outcome = await sendOneReminder(admin, {
      reminderId: row.id as string,
      accountId: row.account_id as string,
      appointmentId: row.appointment_id as string,
    });
    if (outcome.ok) sent++;
    else failed++;
  }

  return NextResponse.json({ processed: due.length, sent, failed });
}

interface ReminderTarget {
  reminderId: string;
  accountId: string;
  appointmentId: string;
}

const REMINDER_TOKEN_RESOLVERS: Record<
  string,
  (ctx: {
    contactName: string;
    accountName: string;
    doctorName: string | null;
    serviceName: string | null;
    startAt: string;
  }) => string
> = {
  contact_name: (ctx) => ctx.contactName,
  account_name: (ctx) => ctx.accountName,
  doctor_name: (ctx) => ctx.doctorName ?? '',
  service_name: (ctx) => ctx.serviceName ?? '',
  appointment_date: (ctx) =>
    new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(ctx.startAt)),
  appointment_time: (ctx) =>
    new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' }).format(new Date(ctx.startAt)),
};

/** Fail (mark 'failed' with a reason) without throwing — the cron loop
 *  keeps draining the rest of the batch regardless of one row's fate. */
async function fail(
  admin: ReturnType<typeof supabaseAdmin>,
  accountId: string,
  reminderId: string,
  message: string,
): Promise<{ ok: false }> {
  await admin
    .from('appointment_reminders')
    .update({ status: 'failed', error_message: message })
    .eq('id', reminderId);
  void logIntegrationError(admin, {
    accountId,
    source: 'appointment_reminder',
    code: null,
    message,
  });
  return { ok: false };
}

async function cancel(
  admin: ReturnType<typeof supabaseAdmin>,
  reminderId: string,
): Promise<{ ok: false }> {
  await admin.from('appointment_reminders').update({ status: 'cancelled' }).eq('id', reminderId);
  return { ok: false };
}

async function sendOneReminder(
  admin: ReturnType<typeof supabaseAdmin>,
  target: ReminderTarget,
): Promise<{ ok: boolean }> {
  const { reminderId, accountId, appointmentId } = target;

  const { data: appointment } = await admin
    .from('appointments')
    .select(
      'id, start_at, status, contact:contacts(id, name, phone), doctor:doctors(name), service_type:service_types(name)',
    )
    .eq('id', appointmentId)
    .eq('account_id', accountId)
    .maybeSingle();

  // The appointment was cancelled/rescheduled/deleted after this
  // reminder was claimed — the `appointments` trigger already handles
  // the common cases, this is just the race-window fallback.
  if (
    !appointment ||
    appointment.status === 'cancelled' ||
    appointment.status === 'no_show' ||
    appointment.status === 'completed' ||
    new Date(appointment.start_at) <= new Date()
  ) {
    return cancel(admin, reminderId);
  }

  const contact = appointment.contact as unknown as { id: string; name: string | null; phone: string | null } | null;
  if (!contact?.phone) {
    return cancel(admin, reminderId);
  }

  const { data: cfg } = await admin
    .from('appointment_reminder_configs')
    .select('is_active, template_name, template_language, variable_mapping')
    .eq('account_id', accountId)
    .maybeSingle();

  if (!cfg?.is_active || !cfg.template_name || !cfg.template_language) {
    // Reminders got turned off (or reconfigured away) since this row
    // was scheduled.
    return cancel(admin, reminderId);
  }

  const { data: template } = await admin
    .from('message_templates')
    .select('body_text, status')
    .eq('account_id', accountId)
    .eq('name', cfg.template_name)
    .eq('language', cfg.template_language)
    .maybeSingle();

  if (!template || template.status !== 'APPROVED') {
    return fail(admin, accountId, reminderId, 'Reminder template is no longer an approved WABA template.');
  }

  const { data: account } = await admin.from('accounts').select('name').eq('id', accountId).maybeSingle();

  const doctor = appointment.doctor as unknown as { name: string } | null;
  const serviceType = appointment.service_type as unknown as { name: string } | null;
  const tokenCtx = {
    contactName: contact.name?.trim() || contact.phone,
    accountName: account?.name ?? '',
    doctorName: doctor?.name ?? null,
    serviceName: serviceType?.name ?? null,
    startAt: appointment.start_at as string,
  };

  const mapping = (cfg.variable_mapping ?? {}) as Record<string, ReminderVariableMapping>;
  const placeholders = Array.from(
    new Set(Array.from(template.body_text.matchAll(/\{\{(\d+)\}\}/g), (m: RegExpMatchArray) => Number(m[1]))),
  ).sort((a, b) => a - b);
  const params = placeholders.map((n) => {
    const entry = mapping[String(n)];
    if (!entry) return '';
    if (entry.type === 'static') return entry.value;
    return REMINDER_TOKEN_RESOLVERS[entry.value]?.(tokenCtx) ?? '';
  });

  const { data: whatsappConfig } = await admin
    .from('whatsapp_config')
    .select('user_id')
    .eq('account_id', accountId)
    .maybeSingle();
  if (!whatsappConfig?.user_id) {
    return fail(admin, accountId, reminderId, 'WhatsApp is not configured for this account.');
  }

  const conversationId = await findOrCreateConversation(admin, accountId, whatsappConfig.user_id, contact.id);
  if (!conversationId) {
    return fail(admin, accountId, reminderId, 'Could not open a conversation for this contact.');
  }

  try {
    await sendMessageToConversation(admin, accountId, {
      conversationId,
      messageType: 'template',
      templateName: cfg.template_name,
      templateLanguage: cfg.template_language,
      templateParams: params,
    });
  } catch (err) {
    const message =
      err instanceof SendMessageError ? err.message : err instanceof Error ? err.message : 'Unknown send error';
    return fail(admin, accountId, reminderId, message);
  }

  await admin
    .from('appointment_reminders')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', reminderId);
  return { ok: true };
}

/** Mirrors `findOrCreateConversation` in `src/app/api/whatsapp/send/route.ts` —
 *  a reminder can be the very first outbound contact with someone who
 *  booked but never messaged in (e.g. via the public booking page). */
async function findOrCreateConversation(
  admin: ReturnType<typeof supabaseAdmin>,
  accountId: string,
  userId: string,
  contactId: string,
): Promise<string | null> {
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await admin
    .from('conversations')
    .insert({ account_id: accountId, user_id: userId, contact_id: contactId })
    .select('id')
    .single();
  if (error) {
    console.error('[appointment-reminders cron] error creating conversation:', error.message);
    return null;
  }
  return created.id;
}
