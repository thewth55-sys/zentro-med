import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { BankTransactionCategory, BankTransactionDirection } from '@/types';

const DIRECTIONS: BankTransactionDirection[] = ['in', 'out'];
const CATEGORIES: BankTransactionCategory[] = [
  'transfer', 'owner_draw', 'capital_contribution', 'bank_fee', 'interest', 'other',
];

/**
 * GET  /api/billing/bank-accounts/[id]/transactions — manual cash
 *      movements for this account (transfers, owner draws, fees…) —
 *      NOT payments or expenses, which are queried separately and
 *      merged client-side into one combined ledger (see
 *      bank-account-detail.tsx).
 * POST /api/billing/bank-accounts/[id]/transactions — record one.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('viewer');
    const { id } = await params;

    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', id)
      .eq('account_id', accountId)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('[bank-account transactions GET] error:', error);
      return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 });
    }

    return NextResponse.json({ transactions: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { data: bankAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();
    if (!bankAccount) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    const direction = typeof body?.direction === 'string' ? body.direction : '';
    const category = typeof body?.category === 'string' ? body.category : 'other';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const amount = Number(body?.amount);

    if (!DIRECTIONS.includes(direction as BankTransactionDirection)) {
      return NextResponse.json({ error: `direction must be one of: ${DIRECTIONS.join(', ')}` }, { status: 400 });
    }
    if (!CATEGORIES.includes(category as BankTransactionCategory)) {
      return NextResponse.json({ error: `category must be one of: ${CATEGORIES.join(', ')}` }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const { data: transaction, error } = await supabase
      .from('bank_transactions')
      .insert({
        account_id: accountId,
        bank_account_id: id,
        direction,
        category,
        description,
        amount,
        transaction_date: typeof body?.transaction_date === 'string' && body.transaction_date ? body.transaction_date : new Date().toISOString().slice(0, 10),
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[bank-account transactions POST] error:', error);
      return NextResponse.json({ error: 'Failed to record the transaction' }, { status: 500 });
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
