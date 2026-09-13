import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { toErrorResponse } from "@/lib/auth/account";
import { requireSectionAccess } from "@/lib/auth/section-access";
import { QuotePdfDocument, type QuotePdfLineItem } from "@/lib/billing/quote-pdf-document";
import { fetchAttendedBy, resolveToothNumbers } from "@/lib/billing/pdf-data";
import { fmtMoney } from "@/lib/billing/pdf-theme";
import { sendEmail } from "@/lib/email/resend-client";
import { renderShellEmail, pacienteShell, escapeHtml, pSaludo, pText, pDestacado, pAdjunto, pNota } from "@/lib/email/branded-template";

/**
 * POST /api/billing/quotes/[id]/send-email — same PDF render as the
 * .../pdf route, attached directly to a Resend email instead of
 * uploaded to storage for a WhatsApp media_url. Requires the contact
 * to have an email on file.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, accountId, account } = await requireSectionAccess("viewer", "billing", request);
    const { id } = await params;

    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("*, contact:contacts(*)")
      .eq("id", id)
      .eq("account_id", accountId)
      .maybeSingle();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    if (!quote.contact?.email) {
      return NextResponse.json({ error: "This patient has no email on file" }, { status: 400 });
    }

    const { data: itemRows } = await supabase
      .from("quote_items")
      .select("description, quantity, unit_price, line_total, odontogram_tooth_id")
      .eq("quote_id", id)
      .order("position", { ascending: true });

    const [attendedBy, toothNumbers] = await Promise.all([
      fetchAttendedBy(supabase, quote.appointment_id ?? null),
      resolveToothNumbers(supabase, itemRows ?? []),
    ]);

    const items: QuotePdfLineItem[] = (itemRows ?? []).map((row) => ({
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      lineTotal: row.line_total,
      toothNumber: row.odontogram_tooth_id ? (toothNumbers.get(row.odontogram_tooth_id) ?? null) : null,
    }));

    const buffer = await renderToBuffer(
      <QuotePdfDocument
        accountName={account.name}
        logoUrl={account.logoUrl}
        accentColor={account.quoteAccentColor}
        address={account.address}
        taxId={account.taxId}
        quoteTerms={account.quoteTerms}
        quoteNumber={quote.quote_number}
        status={quote.status}
        issueDate={quote.issue_date}
        expiryDate={quote.expiry_date ?? null}
        contactName={quote.contact?.name || quote.contact?.phone || "—"}
        contactPhone={quote.contact?.phone ?? ""}
        attendedBy={attendedBy}
        items={items}
        subtotal={quote.subtotal}
        taxTotal={quote.tax_total}
        discountAmount={quote.discount_amount ?? 0}
        discountLabel={quote.discount_type === "percent" ? `${quote.discount_value}%` : null}
        total={quote.total}
        currency={quote.currency}
        notes={quote.notes ?? null}
      />,
    );

    const expiryLabel = quote.expiry_date
      ? new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long" }).format(new Date(quote.expiry_date))
      : null;

    const html = renderShellEmail({
      shell: pacienteShell(account.name, { logoUrl: account.logoUrl, accentColor: account.quoteAccentColor }),
      heading: `Cotización ${quote.quote_number}`,
      blocks: [
        pSaludo(`Hola ${escapeHtml(quote.contact.name || "")},`),
        pText("Adjuntamos la cotización del plan de tratamiento que revisamos en tu consulta."),
        pDestacado("TOTAL", fmtMoney(quote.total, quote.currency), expiryLabel ? `Vigente hasta el ${expiryLabel}` : "Sin fecha de vencimiento", "verde"),
        pAdjunto(`Cotizacion-${quote.quote_number}.pdf`),
        pNota("Si tienes dudas sobre algún tratamiento, respóndenos por WhatsApp y lo revisamos contigo."),
      ],
    });

    await sendEmail({
      to: quote.contact.email,
      subject: `Cotización ${quote.quote_number} — ${account.name}`,
      html,
      fromName: account.name,
      attachments: [{ filename: `Cotizacion-${quote.quote_number}.pdf`, content: buffer }],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
