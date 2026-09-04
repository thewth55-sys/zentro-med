import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';

/**
 * PATCH /api/billing/quotes/[id]/items/[itemId] — toggles ONLY
 * `completed` on one line of a treatment plan (the ficha's checkbox).
 * Deliberately separate from PATCH /quotes/[id], which replaces every
 * line and would be both overkill and risky (recomputes totals) for
 * "the doctor just finished this one procedure".
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const { id, itemId } = await params;
    const body = await request.json().catch(() => ({}));

    if (typeof body.completed !== 'boolean') {
      return NextResponse.json({ error: 'completed (boolean) is required' }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from('quote_items')
      .update({ completed: body.completed })
      .eq('id', itemId)
      .eq('quote_id', id)
      .eq('account_id', accountId)
      .select('*, product:products(*), tax:taxes(*), odontogram_tooth:odontogram_teeth(tooth_number)')
      .maybeSingle();

    if (error) {
      console.error('[quote item PATCH] error:', error);
      return NextResponse.json({ error: 'Failed to update line item' }, { status: 500 });
    }
    if (!item) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    return toErrorResponse(err);
  }
}
