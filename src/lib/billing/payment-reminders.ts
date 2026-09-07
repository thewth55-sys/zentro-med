import type { SupabaseClient } from '@supabase/supabase-js';

import { logIntegrationError } from '@/lib/integration-errors/log';
import {
  sendMessageToConversation,
  SendMessageError,
} from '@/lib/whatsapp/send-message';
import type { PaymentReminderVariableMapping } from '@/types';

/**
 * Shared with /api/payment-reminders/cron (the scheduled drain of due
 * `payment_reminders` rows) and /api/billing/invoices/send-overdue-reminders
 * (the "Enviar recordatorios" button in the Facturas tab, for nudging
 * every currently-overdue invoice right now instead of waiting for its
 * next scheduled +7/+15-day reminder). Both just need to turn one
 * `payment_reminders` row into an actual WhatsApp send — this is that
 * one piece of logic, extracted so neither call site re-implements the
 * template/variable-substitution/conversation-resolution pipeline.
 */

export interface ReminderTarget {
  reminderId: string;
  accountId: string;
  invoiceId: string;
}

const REMINDER_TOKEN_RESOLVERS: Record<
  string,
  (ctx: { contactName: string; accountName: string; invoiceNumber: string; amountDue: string; dueDate: string }) => string
> = {
  contact_name: (ctx) => ctx.contactName,
  account_name: (ctx) => ctx.accountName,
  invoice_number: (ctx) => ctx.invoiceNumber,
  amount_due: (ctx) => ctx.amountDue,
  due_date: (ctx) => ctx.dueDate,
};

async function fail(
  admin: SupabaseClient,
  accountId: string,
  reminderId: string,
  message: string,
): Promise<{ ok: false }> {
  await admin
    .from('payment_reminders')
    .update({ status: 'failed', error_message: message })
    .eq('id', reminderId);
  void logIntegrationError(admin, {
    accountId,
    source: 'payment_reminder',
    code: null,
    message,
  });
  return { ok: false };
}

async function cancel(admin: SupabaseClient, reminderId: string): Promise<{ ok: false }> {
  await admin.from('payment_reminders').update({ status: 'cancelled' }).eq('id', reminderId);
  return { ok: false };
}

/** Mirrors the same helper in /api/appointment-reminders/cron — a
 *  reminder can be the first outbound contact with someone whose
 *  invoice was created without ever messaging in. */
async function findOrCreateConversation(
  admin: SupabaseClient,
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
    console.error('[payment-reminders] error creating conversation:', error.message);
    return null;
  }
  return created.id;
}

/**
 * Sends the WhatsApp template message for one `payment_reminders` row
 * and updates its status accordingly (sent/failed/cancelled). Assumes
 * the row has already been claimed (moved to 'processing') by the
 * caller so two concurrent drains can't double-send the same reminder.
 */
export async function sendOneReminder(
  admin: SupabaseClient,
  target: ReminderTarget,
): Promise<{ ok: boolean }> {
  const { reminderId, accountId, invoiceId } = target;

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, invoice_number, total, amount_paid, currency, status, due_date, contact:contacts(id, name, phone)')
    .eq('id', invoiceId)
    .eq('account_id', accountId)
    .maybeSingle();

  // Already paid/void by the time this fired, or deleted — the
  // invoices trigger (114_payment_reminders.sql) already cancels
  // pending rows on settle, this is just the race-window fallback.
  if (!invoice || invoice.status === 'paid' || invoice.status === 'void') {
    return cancel(admin, reminderId);
  }

  const contact = invoice.contact as unknown as { id: string; name: string | null; phone: string | null } | null;
  if (!contact?.phone) {
    return cancel(admin, reminderId);
  }

  const { data: cfg } = await admin
    .from('payment_reminder_configs')
    .select('is_active, template_name, template_language, variable_mapping')
    .eq('account_id', accountId)
    .maybeSingle();

  if (!cfg?.is_active || !cfg.template_name || !cfg.template_language) {
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

  const amountDue = Number(invoice.total) - Number(invoice.amount_paid);
  const tokenCtx = {
    contactName: contact.name?.trim() || contact.phone,
    accountName: account?.name ?? '',
    invoiceNumber: invoice.invoice_number as string,
    amountDue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: invoice.currency as string }).format(
      amountDue,
    ),
    dueDate: invoice.due_date
      ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(invoice.due_date as string))
      : '',
  };

  const mapping = (cfg.variable_mapping ?? {}) as Record<string, PaymentReminderVariableMapping>;
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
    .from('payment_reminders')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', reminderId);
  return { ok: true };
}
