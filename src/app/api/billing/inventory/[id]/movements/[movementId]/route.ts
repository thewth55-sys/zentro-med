import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';

/** Agent-level, matching `inventory_movements_delete` RLS — same as
 *  payments/bank_transactions, there's no UPDATE policy: correcting
 *  an entry is delete-and-recreate. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; movementId: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const { id, movementId } = await params;

    const { error } = await supabase
      .from('inventory_movements')
      .delete()
      .eq('id', movementId)
      .eq('item_id', id)
      .eq('account_id', accountId);

    if (error) {
      console.error('[inventory movement DELETE] error:', error);
      return NextResponse.json({ error: 'Failed to delete the movement' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
