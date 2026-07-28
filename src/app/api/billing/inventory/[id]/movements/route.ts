import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { InventoryMovementDirection, InventoryMovementReason } from '@/types';

const DIRECTIONS: InventoryMovementDirection[] = ['in', 'out'];
const REASONS: InventoryMovementReason[] = ['purchase', 'consumption', 'waste', 'adjustment', 'other'];

/**
 * GET  /api/billing/inventory/[id]/movements — stock ledger for one item.
 * POST /api/billing/inventory/[id]/movements — record a movement
 *      (purchase/restock is 'in'; consumption/waste/adjustment are
 *      usually 'out', though an adjustment correcting an undercount
 *      can be 'in' too).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireRole('viewer');
    const { id } = await params;

    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('item_id', id)
      .eq('account_id', accountId)
      .order('movement_date', { ascending: false });

    if (error) {
      console.error('[inventory movements GET] error:', error);
      return NextResponse.json({ error: 'Failed to load movements' }, { status: 500 });
    }

    return NextResponse.json({ movements: data ?? [] });
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

    const { data: item } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const direction = typeof body?.direction === 'string' ? body.direction : '';
    const reason = typeof body?.reason === 'string' ? body.reason : 'other';
    const quantity = Number(body?.quantity);

    if (!DIRECTIONS.includes(direction as InventoryMovementDirection)) {
      return NextResponse.json({ error: `direction must be one of: ${DIRECTIONS.join(', ')}` }, { status: 400 });
    }
    if (!REASONS.includes(reason as InventoryMovementReason)) {
      return NextResponse.json({ error: `reason must be one of: ${REASONS.join(', ')}` }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 });
    }

    const unitCostAtTime = body?.unit_cost_at_time !== undefined && body.unit_cost_at_time !== null
      ? Number(body.unit_cost_at_time)
      : null;
    if (unitCostAtTime !== null && !Number.isFinite(unitCostAtTime)) {
      return NextResponse.json({ error: 'unit_cost_at_time must be a number' }, { status: 400 });
    }

    const { data: movement, error } = await supabase
      .from('inventory_movements')
      .insert({
        account_id: accountId,
        item_id: id,
        direction,
        reason,
        quantity,
        unit_cost_at_time: unitCostAtTime,
        expense_id: typeof body?.expense_id === 'string' ? body.expense_id : null,
        notes: typeof body?.notes === 'string' ? body.notes.trim() || null : null,
        movement_date: typeof body?.movement_date === 'string' && body.movement_date ? body.movement_date : new Date().toISOString().slice(0, 10),
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[inventory movements POST] error:', error);
      return NextResponse.json({ error: 'Failed to record the movement' }, { status: 500 });
    }

    return NextResponse.json({ movement }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
