import { NextResponse } from 'next/server';

import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';
import type { PaymentReminderVariableMapping, PaymentReminderVariableToken } from '@/types';

/**
 * Settings-class config for automatic payment reminders (Settings →
 * Recordatorios). Any member can read (GET); only admin+ can write —
 * mirrors /api/appointment-reminders/config exactly, minus
 * `hours_before` (the +7/+15-day offsets are fixed, not configurable).
 */

const REMINDER_TOKENS: PaymentReminderVariableToken[] = [
  'contact_name',
  'account_name',
  'invoice_number',
  'amount_due',
  'due_date',
];

interface ConfigRow {
  is_active: boolean;
  template_name: string | null;
  template_language: string | null;
  variable_mapping: Record<string, PaymentReminderVariableMapping>;
}

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount();

    const { data, error } = await supabase
      .from('payment_reminder_configs')
      .select('is_active, template_name, template_language, variable_mapping')
      .eq('account_id', accountId)
      .maybeSingle<ConfigRow>();

    if (error) {
      console.error('[payment-reminders/config GET] load error:', error);
      return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 });
    }

    return NextResponse.json({ config: data ?? null });
  } catch (err) {
    return toErrorResponse(err);
  }
}

function isValidMapping(value: unknown): value is Record<string, PaymentReminderVariableMapping> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(([key, entry]) => {
    if (!/^\d+$/.test(key)) return false;
    if (!entry || typeof entry !== 'object') return false;
    const e = entry as { type?: unknown; value?: unknown };
    if (e.type === 'static') return typeof e.value === 'string';
    if (e.type === 'token') return REMINDER_TOKENS.includes(e.value as PaymentReminderVariableToken);
    return false;
  });
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin');
    const body = await request.json().catch(() => ({}));

    const variableMapping = body.variable_mapping ?? {};
    if (!isValidMapping(variableMapping)) {
      return NextResponse.json({ error: 'Invalid variable_mapping' }, { status: 400 });
    }

    const isActive = Boolean(body.is_active);
    const templateName = typeof body.template_name === 'string' ? body.template_name.trim() || null : null;
    const templateLanguage =
      typeof body.template_language === 'string' ? body.template_language.trim() || null : null;

    if (isActive && (!templateName || !templateLanguage)) {
      return NextResponse.json(
        { error: 'Select a WhatsApp template before activating reminders' },
        { status: 400 },
      );
    }

    const payload = {
      account_id: accountId,
      created_by: userId,
      is_active: isActive,
      template_name: templateName,
      template_language: templateLanguage,
      variable_mapping: variableMapping,
    };

    const { error } = await supabase
      .from('payment_reminder_configs')
      .upsert(payload, { onConflict: 'account_id' });

    if (error) {
      console.error('[payment-reminders/config POST] save error:', error);
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
