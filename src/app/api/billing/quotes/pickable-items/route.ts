import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';

/**
 * GET /api/billing/quotes/pickable-items?contact_id=X — treatment-plan
 * line items available to pull into a new invoice ("Traer del plan de
 * tratamiento"): every item on that contact's ACCEPTED quotes that
 * hasn't already been pulled into a different invoice
 * (`invoice_items.source_quote_item_id`) — a whole-quote conversion
 * (`/quotes/[id]/convert`) already marks the quote itself
 * `converted`, so its items are naturally excluded once that happens;
 * this only guards against pulling the same item twice via THIS
 * partial-pick flow.
 */
export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('viewer');
    const url = new URL(request.url);
    const contactId = url.searchParams.get('contact_id');
    if (!contactId) {
      return NextResponse.json({ error: 'contact_id is required' }, { status: 400 });
    }

    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id, quote_number')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('status', 'accepted');
    if (quotesError) {
      console.error('[pickable-items GET] quotes error:', quotesError);
      return NextResponse.json({ error: 'Failed to load treatment plan' }, { status: 500 });
    }
    if (!quotes || quotes.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const { data: alreadyPulled } = await supabase
      .from('invoice_items')
      .select('source_quote_item_id')
      .eq('account_id', accountId)
      .not('source_quote_item_id', 'is', null);
    const pulledIds = new Set((alreadyPulled ?? []).map((r) => r.source_quote_item_id as string));

    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select(
        'id, quote_id, product_id, description, quantity, unit_price, tax_id, discount_type, discount_value, position, completed, odontogram_tooth_id, odontogram_tooth:odontogram_teeth(tooth_number), phase:quote_phases(name)'
      )
      .in(
        'quote_id',
        quotes.map((q) => q.id)
      )
      .order('position', { ascending: true });
    if (itemsError) {
      console.error('[pickable-items GET] items error:', itemsError);
      return NextResponse.json({ error: 'Failed to load treatment plan items' }, { status: 500 });
    }

    const quoteNumberById = new Map(quotes.map((q) => [q.id, q.quote_number]));
    const pickable = (items ?? [])
      .filter((item) => !item.completed && !pulledIds.has(item.id))
      .map((item) => ({
        ...item,
        quote_number: quoteNumberById.get(item.quote_id) ?? null,
      }));

    return NextResponse.json({ items: pickable });
  } catch (err) {
    return toErrorResponse(err);
  }
}
