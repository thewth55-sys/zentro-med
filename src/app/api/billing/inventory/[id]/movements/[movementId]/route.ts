import { NextResponse } from 'next/server';

import { toErrorResponse } from '@/lib/auth/account';
import { requireSectionAccess } from "@/lib/auth/section-access";
/** Agent-level, matching `inventory_movements_delete` RLS — same as
 *  payments/bank_transactions, there's no UPDATE policy: correcting
 *  an entry is delete-and-recreate. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; movementId: string }> }
) {
  try {
    const { supabase, accountId } = await requireSectionAccess('agent', "inventory", request);
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
