import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';

const RESULT_LIMIT = 5;

/**
 * GET /api/search?q=<term> — global search for the header's ⌘K bar.
 * Cross-entity (pacientes/citas/facturas), each capped to RESULT_LIMIT
 * so the dropdown stays scannable. Everything is scoped by RLS via
 * the caller's own account — no admin client, no account_id filter
 * needed beyond what `requireRole` already gives us.
 *
 * Appointments/invoices have no free-text column of their own worth
 * searching (no appointment "title", invoices only have a number) —
 * "buscar por paciente" is the common case, so both also match by
 * resolving contact ids from the same name/phone ilike first, same
 * pattern already used by /contacts and use-patients-list.ts.
 */
export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('viewer');
    const url = new URL(request.url);
    const term = (url.searchParams.get('q') ?? '').trim();

    if (term.length < 2) {
      return NextResponse.json({ patients: [], appointments: [], invoices: [] });
    }

    const like = `%${term}%`;

    const { data: matchingContacts } = await supabase
      .from('contacts')
      .select('id, name, phone')
      .eq('account_id', accountId)
      .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
      .limit(RESULT_LIMIT);

    const contactIds = (matchingContacts ?? []).map((c) => c.id);

    const [appointmentsRes, invoicesRes] = await Promise.all([
      contactIds.length > 0
        ? supabase
            .from('appointments')
            .select('id, contact_id, start_at, status, contact:contacts(name), service_type:service_types(name)')
            .eq('account_id', accountId)
            .in('contact_id', contactIds)
            .neq('status', 'cancelled')
            .order('start_at', { ascending: false })
            .limit(RESULT_LIMIT)
        : Promise.resolve({ data: [] as unknown[] }),
      supabase
        .from('invoices')
        .select('id, contact_id, invoice_number, total, status, contact:contacts(name)')
        .eq('account_id', accountId)
        .or(
          contactIds.length > 0
            ? `invoice_number.ilike.${like},contact_id.in.(${contactIds.join(',')})`
            : `invoice_number.ilike.${like}`,
        )
        .order('created_at', { ascending: false })
        .limit(RESULT_LIMIT),
    ]);

    return NextResponse.json({
      patients: matchingContacts ?? [],
      appointments: appointmentsRes.data ?? [],
      invoices: invoicesRes.data ?? [],
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
