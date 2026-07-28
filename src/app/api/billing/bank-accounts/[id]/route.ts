import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';

const PATCHABLE_FIELDS = ['name', 'bank_name', 'account_number_last4', 'is_active'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const updates: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (field in body) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: bankAccount, error } = await supabase
      .from('bank_accounts')
      .update(updates)
      .eq('id', id)
      .eq('account_id', accountId)
      .select('*')
      .single();

    if (error) {
      console.error('[bank-accounts PATCH] error:', error);
      return NextResponse.json({ error: 'Failed to update the bank account' }, { status: 500 });
    }

    return NextResponse.json({ bankAccount });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Admin-only, matching the RLS `bank_accounts_delete` policy — a
 *  bank account disappearing (and every payment/expense attributed
 *  to it losing that link) should be a deliberate admin action. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('admin');
    const { id } = await params;

    const { error } = await supabase.from('bank_accounts').delete().eq('id', id).eq('account_id', accountId);
    if (error) {
      console.error('[bank-accounts DELETE] error:', error);
      return NextResponse.json({ error: 'Failed to delete the bank account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
