import { NextResponse } from 'next/server';

import { toErrorResponse } from '@/lib/auth/account';
import { requireSectionAccess } from '@/lib/auth/section-access';
import { notifyAccountTeam } from '@/lib/email/notify-team';
import { escapeHtml, pDestacado, pTabla, pEnlace } from '@/lib/email/branded-template';
import { fmtMoney } from '@/lib/billing/pdf-theme';

const VALID_METHODS = ['cash', 'card', 'transfer', 'other'] as const;

/**
 * GET  /api/billing/invoices/[id]/payments — list payments for an invoice.
 * POST /api/billing/invoices/[id]/payments — record a payment. The DB
 *      trigger (recompute_invoice_amount_paid, migration 039) updates
 *      invoices.amount_paid and status automatically — this route
 *      never touches those columns.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId } = await requireSectionAccess('viewer', "billing", request);
    const { id } = await params;

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .eq('account_id', accountId)
      .order('paid_at', { ascending: false });

    if (error) {
      console.error('[payments GET] error:', error);
      return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 });
    }

    return NextResponse.json({ payments: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId, userId } = await requireSectionAccess('agent', "billing", request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const amount = Number(body.amount);
    if (!(amount > 0)) {
      return NextResponse.json({ error: 'amount must be greater than zero' }, { status: 400 });
    }
    const method = VALID_METHODS.includes(body.method) ? body.method : 'other';

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, status, invoice_number, currency, total, contact:contacts(name, phone)')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();
    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (invoice.status === 'void') {
      return NextResponse.json({ error: 'Cannot record a payment on a void invoice' }, { status: 400 });
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        account_id: accountId,
        invoice_id: id,
        amount,
        method,
        paid_at: body.paid_at || new Date().toISOString(),
        notes: body.notes || null,
        bank_account_id: typeof body.bank_account_id === 'string' ? body.bank_account_id : null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[payments POST] error:', error);
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }

    const contact = Array.isArray(invoice.contact) ? invoice.contact[0] : invoice.contact;

    const { data: updated } = await supabase
      .from('invoices')
      .select('status, amount_paid')
      .eq('id', id)
      .maybeSingle();
    const saldo = updated?.status === 'paid'
      ? 'Liquidada'
      : `Pendiente ${fmtMoney(invoice.total - (updated?.amount_paid ?? amount), invoice.currency)}`;
    const METHOD_LABELS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };

    void notifyAccountTeam(supabase, {
      accountId,
      subject: `Pago recibido — Factura ${invoice.invoice_number}`,
      heading: 'Pago recibido',
      sub: 'Aviso de cobranza',
      blocks: [
        pDestacado('MONTO REGISTRADO', fmtMoney(amount, invoice.currency), METHOD_LABELS[method] ?? 'Otro', 'verde'),
        pTabla([
          { k: 'Factura', v: escapeHtml(invoice.invoice_number) },
          ...(contact?.name ? [{ k: 'Paciente', v: escapeHtml(contact.name) }] : []),
          { k: 'Saldo', v: saldo },
        ]),
        pEnlace('Ver la factura →', 'https://med.zentrolabs.com/billing'),
      ],
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
