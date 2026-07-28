import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { ExpenseCategory, PaymentMethod } from '@/types';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'rent', 'payroll', 'supplies', 'utilities', 'marketing', 'equipment', 'taxes', 'software', 'other',
];
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer', 'other'];

/**
 * GET  /api/billing/expenses  — list expenses (filtered by category/date range).
 * POST /api/billing/expenses  — record a new expense.
 */
export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('viewer');
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('account_id', accountId)
      .order('expense_date', { ascending: false });

    if (category) query = query.eq('category', category);
    if (from) query = query.gte('expense_date', from);
    if (to) query = query.lte('expense_date', to);

    const { data, error } = await query;
    if (error) {
      console.error('[expenses GET] error:', error);
      return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 });
    }

    return NextResponse.json({ expenses: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const body = await request.json().catch(() => ({}));

    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const amount = Number(body?.amount);
    const category = typeof body?.category === 'string' ? body.category : 'other';
    const paymentMethod = typeof body?.payment_method === 'string' ? body.payment_method : 'other';

    if (!description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (!EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
      return NextResponse.json({ error: `category must be one of: ${EXPENSE_CATEGORIES.join(', ')}` }, { status: 400 });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
      return NextResponse.json({ error: `payment_method must be one of: ${PAYMENT_METHODS.join(', ')}` }, { status: 400 });
    }

    const { data: account } = await supabase
      .from('accounts')
      .select('default_currency')
      .eq('id', accountId)
      .maybeSingle();

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        account_id: accountId,
        category,
        description,
        amount,
        currency: account?.default_currency ?? 'USD',
        expense_date: typeof body?.expense_date === 'string' && body.expense_date ? body.expense_date : new Date().toISOString().slice(0, 10),
        vendor: typeof body?.vendor === 'string' ? body.vendor.trim() || null : null,
        payment_method: paymentMethod,
        bank_account_id: typeof body?.bank_account_id === 'string' ? body.bank_account_id : null,
        notes: typeof body?.notes === 'string' ? body.notes.trim() || null : null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[expenses POST] error:', error);
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
