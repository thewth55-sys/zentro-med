import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/billing-platform/admin-client';
import { timingSafeSecretEqual } from '@/lib/cron/verify-secret';
import { sendOneReminder } from '@/lib/billing/payment-reminders';

/**
 * Drain due `payment_reminders` rows and send them as WhatsApp
 * template messages — same shape as
 * /api/appointment-reminders/cron, but for an invoice that's still
 * unpaid instead of an upcoming appointment. Requires a shared secret
 * via the `x-cron-secret` header matching `PAYMENT_REMINDERS_CRON_SECRET`.
 *
 * The actual per-reminder send lives in src/lib/billing/payment-reminders.ts,
 * shared with /api/billing/invoices/send-overdue-reminders (the manual
 * "Enviar recordatorios" button) — this route is just the scheduled
 * drain loop around it.
 */
export async function GET(request: Request) {
  const expected = process.env.PAYMENT_REMINDERS_CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 });
  }
  const supplied = request.headers.get('x-cron-secret');
  if (!timingSafeSecretEqual(supplied, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: due, error } = await admin
    .from('payment_reminders')
    .select('id, account_id, invoice_id')
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
      .from('payment_reminders')
      .update({ status: 'processing' })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (!claim) continue;

    const outcome = await sendOneReminder(admin, {
      reminderId: row.id as string,
      accountId: row.account_id as string,
      invoiceId: row.invoice_id as string,
    });
    if (outcome.ok) sent++;
    else failed++;
  }

  return NextResponse.json({ processed: due.length, sent, failed });
}
