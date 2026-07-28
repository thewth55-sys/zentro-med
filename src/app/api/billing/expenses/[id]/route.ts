import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { ExpenseCategory, PaymentMethod } from '@/types';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'rent', 'payroll', 'supplies', 'utilities', 'marketing', 'equipment', 'taxes', 'software', 'other',
];
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer', 'other'];
const PATCHABLE_FIELDS = ['category', 'description', 'amount', 'expense_date', 'vendor', 'payment_method', 'notes'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if ('category' in body && !EXPENSE_CATEGORIES.includes(body.category as ExpenseCategory)) {
      return NextResponse.json({ error: `category must be one of: ${EXPENSE_CATEGORIES.join(', ')}` }, { status: 400 });
    }
    if ('payment_method' in body && !PAYMENT_METHODS.includes(body.payment_method as PaymentMethod)) {
      return NextResponse.json({ error: `payment_method must be one of: ${PAYMENT_METHODS.join(', ')}` }, { status: 400 });
    }
    if ('amount' in body && (!Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0)) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (field in body) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .eq('account_id', accountId)
      .select('*')
      .single();

    if (error) {
      console.error('[expenses PATCH] error:', error);
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
    }

    return NextResponse.json({ expense });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Admin-only, matching the RLS `expenses_delete` policy — same
 *  sensitivity class as invoices (a financial record shouldn't
 *  quietly disappear from a P&L report). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('admin');
    const { id } = await params;

    const { error } = await supabase.from('expenses').delete().eq('id', id).eq('account_id', accountId);
    if (error) {
      console.error('[expenses DELETE] error:', error);
      return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
