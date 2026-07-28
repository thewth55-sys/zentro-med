import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { BankTransactionCategory, BankTransactionDirection } from '@/types';

const PATCHABLE_FIELDS = ['direction', 'category', 'description', 'amount', 'transaction_date'] as const;
const DIRECTIONS: BankTransactionDirection[] = ['in', 'out'];
const CATEGORIES: BankTransactionCategory[] = [
  'transfer', 'owner_draw', 'capital_contribution', 'bank_fee', 'interest', 'other',
];

/** Agent-level, matching `bank_transactions_update` RLS (migration
 *  081) — lets staff edit and recategorize a movement in place. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; transactionId: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const { id, transactionId } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (field in body) updates[field] = body[field];
    }

    if (updates.direction !== undefined && !DIRECTIONS.includes(updates.direction as BankTransactionDirection)) {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 400 });
    }
    if (updates.category !== undefined && !CATEGORIES.includes(updates.category as BankTransactionCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (updates.amount !== undefined && (typeof updates.amount !== 'number' || updates.amount <= 0)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (updates.description !== undefined && !String(updates.description).trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('bank_transactions')
      .update(updates)
      .eq('id', transactionId)
      .eq('bank_account_id', id)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      console.error('[bank-account transaction PATCH] error:', error);
      return NextResponse.json({ error: 'Failed to update the transaction' }, { status: 500 });
    }

    return NextResponse.json({ transaction: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Agent-level, matching `bank_transactions_delete` RLS. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; transactionId: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const { id, transactionId } = await params;

    const { error } = await supabase
      .from('bank_transactions')
      .delete()
      .eq('id', transactionId)
      .eq('bank_account_id', id)
      .eq('account_id', accountId);

    if (error) {
      console.error('[bank-account transaction DELETE] error:', error);
      return NextResponse.json({ error: 'Failed to delete the transaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
