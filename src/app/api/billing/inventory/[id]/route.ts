import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { InventoryCategory } from '@/types';

const CATEGORIES: InventoryCategory[] = ['supplies', 'materials', 'instruments', 'equipment', 'other'];
const PATCHABLE_FIELDS = ['name', 'category', 'sku', 'unit', 'unit_cost', 'minimum_stock', 'supplier', 'is_active'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('agent');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if ('category' in body && !CATEGORIES.includes(body.category as InventoryCategory)) {
      return NextResponse.json({ error: `category must be one of: ${CATEGORIES.join(', ')}` }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (field in body) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .eq('account_id', accountId)
      .select('*')
      .single();

    if (error) {
      console.error('[inventory PATCH] error:', error);
      return NextResponse.json({ error: 'Failed to update the inventory item' }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Admin-only, matching the RLS `inventory_items_delete` policy —
 *  removing an item type entirely (and its movement history via
 *  cascade) should be a deliberate admin action. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('admin');
    const { id } = await params;

    const { error } = await supabase.from('inventory_items').delete().eq('id', id).eq('account_id', accountId);
    if (error) {
      console.error('[inventory DELETE] error:', error);
      return NextResponse.json({ error: 'Failed to delete the inventory item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
