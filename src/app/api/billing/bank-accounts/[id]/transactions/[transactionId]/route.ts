import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';

/** Agent-level, matching `bank_transactions_delete` RLS — same as
 *  payments, there's no UPDATE policy: correcting an entry is
 *  delete-and-recreate. */
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
