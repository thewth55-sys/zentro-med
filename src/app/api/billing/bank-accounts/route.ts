import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { BankAccount } from '@/types';

/**
 * GET  /api/billing/bank-accounts — list bank accounts, each with a
 *      computed_balance (opening_balance + attributed payments minus
 *      expenses minus/plus bank_transactions). N+1 aggregate queries
 *      per account is fine here — clinics have a handful of bank
 *      accounts at most, not hundreds.
 * POST /api/billing/bank-accounts — register a new bank account.
 */
export async function GET() {
  try {
    const { supabase, accountId } = await requireRole('viewer');

    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[bank-accounts GET] error:', error);
      return NextResponse.json({ error: 'Failed to load bank accounts' }, { status: 500 });
    }

    const withBalances = await Promise.all(
      (accounts ?? []).map(async (account) => {
        const [paymentsRes, expensesRes, transactionsRes] = await Promise.all([
          supabase.from('payments').select('amount').eq('bank_account_id', account.id),
          supabase.from('expenses').select('amount').eq('bank_account_id', account.id),
          supabase.from('bank_transactions').select('amount, direction').eq('bank_account_id', account.id),
        ]);

        const paymentsTotal = (paymentsRes.data ?? []).reduce((sum, p) => sum + p.amount, 0);
        const expensesTotal = (expensesRes.data ?? []).reduce((sum, e) => sum + e.amount, 0);
        const transactionsTotal = (transactionsRes.data ?? []).reduce(
          (sum, t) => sum + (t.direction === 'in' ? t.amount : -t.amount),
          0,
        );

        return {
          ...account,
          computed_balance: account.opening_balance + paymentsTotal - expensesTotal + transactionsTotal,
        } as BankAccount;
      }),
    );

    return NextResponse.json({ bankAccounts: withBalances });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const body = await request.json().catch(() => ({}));

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const openingBalance = body?.opening_balance !== undefined ? Number(body.opening_balance) : 0;
    if (!Number.isFinite(openingBalance)) {
      return NextResponse.json({ error: 'opening_balance must be a number' }, { status: 400 });
    }

    const { data: account } = await supabase
      .from('accounts')
      .select('default_currency')
      .eq('id', accountId)
      .maybeSingle();

    const { data: bankAccount, error } = await supabase
      .from('bank_accounts')
      .insert({
        account_id: accountId,
        name,
        bank_name: typeof body?.bank_name === 'string' ? body.bank_name.trim() || null : null,
        account_number_last4: typeof body?.account_number_last4 === 'string' ? body.account_number_last4.trim().slice(-4) || null : null,
        currency: account?.default_currency ?? 'USD',
        opening_balance: openingBalance,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[bank-accounts POST] error:', error);
      return NextResponse.json({ error: 'Failed to create the bank account' }, { status: 500 });
    }

    return NextResponse.json({ bankAccount: { ...bankAccount, computed_balance: openingBalance } }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
