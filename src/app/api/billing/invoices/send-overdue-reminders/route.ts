import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/billing-platform/admin-client';
import { sendOneReminder } from '@/lib/billing/payment-reminders';

/**
 * POST /api/billing/invoices/send-overdue-reminders  (agent+)
 *
 * The "Enviar recordatorios" button in the Facturas tab's "Cobranza
 * vencida" card — nudges every currently-overdue invoice right now,
 * instead of waiting for its next scheduled +7/+15-day reminder
 * (migration 114). For an overdue invoice that already has a pending
 * reminder queued, that row is fast-tracked to send now rather than
 * creating a second, redundant one for the same invoice.
 *
 * Uses the same account-scoped `payment_reminder_configs` gate as the
 * cron (src/lib/billing/payment-reminders.ts) — if reminders aren't
 * configured/active, every send is skipped with a clear reason instead
 * of the button silently doing nothing.
 */
export async function POST() {
  try {
    const { accountId } = await requireRole('agent');
    const admin = supabaseAdmin();

    const { data: cfg } = await admin
      .from('payment_reminder_configs')
      .select('is_active, template_name, template_language')
      .eq('account_id', accountId)
      .maybeSingle();
    if (!cfg?.is_active || !cfg.template_name || !cfg.template_language) {
      return NextResponse.json(
        {
          error:
            'Configura una plantilla de recordatorio de pago en Ajustes → Recordatorios antes de enviar recordatorios.',
        },
        { status: 400 },
      );
    }

    const { data: overdueInvoices, error: overdueError } = await admin
      .from('invoices')
      .select('id')
      .eq('account_id', accountId)
      .eq('status', 'overdue');
    if (overdueError) {
      return NextResponse.json({ error: 'Failed to load overdue invoices' }, { status: 500 });
    }
    if (!overdueInvoices || overdueInvoices.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, skipped: 0, total: 0 });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const invoice of overdueInvoices) {
      const invoiceId = invoice.id as string;

      // Reuse an existing pending reminder for this invoice rather than
      // stacking a second one — fast-track it to send now.
      const { data: existing } = await admin
        .from('payment_reminders')
        .select('id')
        .eq('invoice_id', invoiceId)
        .eq('status', 'pending')
        .maybeSingle();

      let reminderId: string;
      if (existing) {
        const { data: claimed } = await admin
          .from('payment_reminders')
          .update({ status: 'processing', send_at: new Date().toISOString() })
          .eq('id', existing.id)
          .eq('status', 'pending')
          .select('id')
          .maybeSingle();
        if (!claimed) {
          // Another request (or the cron) claimed it in the same
          // instant — not a failure, just nothing left for us to do.
          skipped++;
          continue;
        }
        reminderId = claimed.id;
      } else {
        const { data: created, error: createError } = await admin
          .from('payment_reminders')
          .insert({
            account_id: accountId,
            invoice_id: invoiceId,
            send_at: new Date().toISOString(),
            status: 'processing',
          })
          .select('id')
          .single();
        if (createError || !created) {
          failed++;
          continue;
        }
        reminderId = created.id;
      }

      const outcome = await sendOneReminder(admin, { reminderId, accountId, invoiceId });
      if (outcome.ok) sent++;
      else failed++;
    }

    return NextResponse.json({ sent, failed, skipped, total: overdueInvoices.length });
  } catch (err) {
    return toErrorResponse(err);
  }
}
