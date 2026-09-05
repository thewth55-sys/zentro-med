import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { resolveBillingLines } from '@/lib/billing/resolve-items';

/**
 * GET  /api/billing/invoices  — list invoices (filtered by contact/deal/status).
 * POST /api/billing/invoices  — create a standalone invoice with line
 *                                items (not from a quote — see
 *                                /api/billing/quotes/[id]/convert for
 *                                that path).
 */
export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('viewer');
    const url = new URL(request.url);
    const contactId = url.searchParams.get('contact_id');
    const dealId = url.searchParams.get('deal_id');
    const status = url.searchParams.get('status');

    let query = supabase
      .from('invoices')
      .select('*, contact:contacts(*)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (contactId) query = query.eq('contact_id', contactId);
    if (dealId) query = query.eq('deal_id', dealId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      console.error('[invoices GET] error:', error);
      return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 });
    }

    return NextResponse.json({ invoices: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const body = await request.json().catch(() => ({}));

    if (!body.contact_id) {
      return NextResponse.json({ error: 'contact_id is required' }, { status: 400 });
    }

    let resolved;
    try {
      resolved = await resolveBillingLines(supabase, accountId, body.items ?? [], body.discount_type, body.discount_value);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid line items' }, { status: 400 });
    }

    const { data: account } = await supabase
      .from('accounts')
      .select('default_currency')
      .eq('id', accountId)
      .maybeSingle();

    const { data: invoiceNumber, error: numberError } = await supabase.rpc('next_billing_number', {
      p_account_id: accountId,
      p_doc_type: 'invoice',
    });
    if (numberError || !invoiceNumber) {
      console.error('[invoices POST] numbering error:', numberError);
      return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 });
    }

    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        account_id: accountId,
        contact_id: body.contact_id,
        deal_id: body.deal_id || null,
        appointment_id: body.appointment_id || null,
        invoice_number: invoiceNumber,
        issue_date: body.issue_date || undefined,
        due_date: body.due_date || null,
        payment_method_intent: body.payment_method_intent || null,
        subtotal: resolved.subtotal,
        tax_total: resolved.taxTotal,
        discount_type: resolved.discountType,
        discount_value: resolved.discountValue,
        discount_amount: resolved.discountAmount,
        total: resolved.total,
        currency: account?.default_currency ?? 'USD',
        notes: body.notes || null,
        created_by: userId,
      })
      .select('*, contact:contacts(*)')
      .single();

    if (insertError) {
      console.error('[invoices POST] insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    // odontogram_tooth_id/phase_label/source_quote_item_id no pasan por
    // resolveBillingLines (compartida con cotizaciones, valida solo lo
    // que ambas necesitan) — se toman directo del body por índice,
    // igual que ya hace quotes/route.ts con odontogram_tooth_id/phase_id.
    const rawItems: Array<{ odontogram_tooth_id?: string; phase_label?: string; source_quote_item_id?: string }> =
      Array.isArray(body.items) ? body.items : [];

    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .insert(
        resolved.items.map((item, i) => ({
          ...item,
          account_id: accountId,
          invoice_id: invoice.id,
          odontogram_tooth_id: rawItems[i]?.odontogram_tooth_id || null,
          phase_label: rawItems[i]?.phase_label || null,
          source_quote_item_id: rawItems[i]?.source_quote_item_id || null,
        })),
      )
      .select('*, product:products(*), tax:taxes(*), odontogram_tooth:odontogram_teeth(tooth_number)');

    if (itemsError) {
      console.error('[invoices POST] items insert error:', itemsError);
      await supabase.from('invoices').delete().eq('id', invoice.id);
      return NextResponse.json({ error: 'Failed to save line items' }, { status: 500 });
    }

    // Una línea traída del plan de tratamiento marca su origen como
    // "hecho" al emitir la factura — mismo estado que ya usa la vista
    // del plan (quote_items.completed), no uno nuevo desincronizado.
    const sourceQuoteItemIds = rawItems.map((r) => r.source_quote_item_id).filter((id): id is string => !!id);
    if (sourceQuoteItemIds.length > 0) {
      await supabase.from('quote_items').update({ completed: true }).in('id', sourceQuoteItemIds);
    }

    // "Agrupar facturas" — la factura vieja no se toca en sus propios
    // totales/pagos, solo se cierra y se enlaza a esta nueva (ver
    // 112_invoice_supersede.sql). Falla silenciosa y logueada: la
    // factura nueva ya existe y es correcta pase lo que pase aquí.
    if (body.supersede_invoice_id) {
      const { error: supersedeError } = await supabase
        .from('invoices')
        .update({ status: 'void', superseded_by_invoice_id: invoice.id })
        .eq('id', body.supersede_invoice_id)
        .eq('account_id', accountId)
        .eq('contact_id', body.contact_id);
      if (supersedeError) {
        console.error('[invoices POST] failed to supersede invoice', body.supersede_invoice_id, supersedeError);
      }
    }

    // "Anticipo aplicado" — el monto SIEMPRE se relee del propio
    // anticipo (113_invoice_deposit_apply.sql), nunca del body, y solo
    // si sigue disponible (is_deposit_invoice, paid, sin aplicar) —
    // evita aplicar el mismo anticipo dos veces por una doble
    // llamada. Se registra como un pago real sobre la factura nueva
    // (no como una resta de su total) para que quede un rastro
    // contable de por qué quedó parcial/pagada desde el momento en
    // que se creó.
    if (body.apply_deposit_invoice_id) {
      const { data: depositInvoice } = await supabase
        .from('invoices')
        .select('id, invoice_number, total')
        .eq('id', body.apply_deposit_invoice_id)
        .eq('account_id', accountId)
        .eq('is_deposit_invoice', true)
        .eq('status', 'paid')
        .is('applied_to_invoice_id', null)
        .maybeSingle();
      if (depositInvoice) {
        const { error: paymentError } = await supabase.from('payments').insert({
          account_id: accountId,
          invoice_id: invoice.id,
          amount: depositInvoice.total,
          method: 'card',
          paid_at: new Date().toISOString(),
          notes: `Anticipo aplicado — ${depositInvoice.invoice_number}`,
        });
        if (paymentError) {
          console.error('[invoices POST] failed to apply deposit payment', paymentError);
        } else {
          await supabase.from('invoices').update({ applied_to_invoice_id: invoice.id }).eq('id', depositInvoice.id);
        }
      }
    }

    // Recordatorios de pago a +7/+15 días de la fecha de emisión (ver
    // 114_payment_reminders.sql) — el cron los cancela solos si la
    // factura se paga antes de que toque enviarlos.
    if (body.schedule_payment_reminders) {
      const issueDateBase = new Date(`${invoice.issue_date}T00:00:00Z`);
      const reminderRows = [7, 15].map((days) => ({
        account_id: accountId,
        invoice_id: invoice.id,
        send_at: new Date(issueDateBase.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
      }));
      const { error: reminderError } = await supabase.from('payment_reminders').insert(reminderRows);
      if (reminderError) {
        console.error('[invoices POST] failed to schedule payment reminders', reminderError);
      }
    }

    return NextResponse.json({ invoice: { ...invoice, items: items ?? [] } }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
