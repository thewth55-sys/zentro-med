import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { InventoryCategory, InventoryItem } from '@/types';

const CATEGORIES: InventoryCategory[] = ['supplies', 'materials', 'instruments', 'equipment', 'other'];

/**
 * GET  /api/billing/inventory — list inventory items, each with a
 *      computed_stock (initial_stock + attributed movements, signed
 *      by direction). Same N+1-aggregate-per-item shape as
 *      bank-accounts' GET — clinics have dozens of supply types at
 *      most, not thousands.
 * POST /api/billing/inventory — register a new inventory item.
 */
export async function GET() {
  try {
    const { supabase, accountId } = await requireRole('viewer');

    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('account_id', accountId)
      .order('name', { ascending: true });

    if (error) {
      console.error('[inventory GET] error:', error);
      return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
    }

    const withStock = await Promise.all(
      (items ?? []).map(async (item) => {
        const { data: movements } = await supabase
          .from('inventory_movements')
          .select('quantity, direction')
          .eq('item_id', item.id);

        const movementsTotal = (movements ?? []).reduce(
          (sum, m) => sum + (m.direction === 'in' ? m.quantity : -m.quantity),
          0,
        );

        return { ...item, computed_stock: item.initial_stock + movementsTotal } as InventoryItem;
      }),
    );

    return NextResponse.json({ items: withStock });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const body = await request.json().catch(() => ({}));

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const category = typeof body?.category === 'string' ? body.category : 'supplies';
    const unit = typeof body?.unit === 'string' ? body.unit.trim() || 'unidad' : 'unidad';

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!CATEGORIES.includes(category as InventoryCategory)) {
      return NextResponse.json({ error: `category must be one of: ${CATEGORIES.join(', ')}` }, { status: 400 });
    }

    const initialStock = body?.initial_stock !== undefined ? Number(body.initial_stock) : 0;
    const minimumStock = body?.minimum_stock !== undefined ? Number(body.minimum_stock) : 0;
    const unitCost = body?.unit_cost !== undefined && body.unit_cost !== null ? Number(body.unit_cost) : null;

    if (!Number.isFinite(initialStock) || !Number.isFinite(minimumStock)) {
      return NextResponse.json({ error: 'initial_stock and minimum_stock must be numbers' }, { status: 400 });
    }
    if (unitCost !== null && !Number.isFinite(unitCost)) {
      return NextResponse.json({ error: 'unit_cost must be a number' }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from('inventory_items')
      .insert({
        account_id: accountId,
        name,
        category,
        sku: typeof body?.sku === 'string' ? body.sku.trim() || null : null,
        unit,
        unit_cost: unitCost,
        initial_stock: initialStock,
        minimum_stock: minimumStock,
        supplier: typeof body?.supplier === 'string' ? body.supplier.trim() || null : null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[inventory POST] error:', error);
      return NextResponse.json({ error: 'Failed to create the inventory item' }, { status: 500 });
    }

    return NextResponse.json({ item: { ...item, computed_stock: initialStock } }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
