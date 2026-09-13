import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { toErrorResponse } from "@/lib/auth/account";
import { requireSectionAccess } from "@/lib/auth/section-access";
import { ReceiptPdfDocument } from "@/lib/billing/receipt-pdf-document";
import { fmtMoney } from "@/lib/billing/pdf-theme";
import { sendEmail } from "@/lib/email/resend-client";
import { renderShellEmail, pacienteShell, escapeHtml, pSaludo, pText, pDestacado, pAdjunto, pNota } from "@/lib/email/branded-template";

/**
 * POST /api/billing/invoices/[id]/payments/[paymentId]/receipt/send-email
 * — same PDF render as the .../receipt route, attached directly to a
 * Resend email instead of uploaded to storage. Requires the contact
 * to have an email on file.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  try {
    const { supabase, accountId, account } = await requireSectionAccess("viewer", "billing", request);
    const { id, paymentId } = await params;

    const { data: invoice, error: invoiceErr } = await supabase
      .from("invoices")
      .select("*, contact:contacts(*)")
      .eq("id", id)
      .eq("account_id", accountId)
      .maybeSingle();
    if (invoiceErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (!invoice.contact?.email) {
      return NextResponse.json({ error: "This patient has no email on file" }, { status: 400 });
    }

    const { data: payments, error: paymentsErr } = await supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", id)
      .order("paid_at", { ascending: true });
    if (paymentsErr || !payments) {
      return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
    }

    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const amountPaidToDate = payments
      .filter((p) => new Date(p.paid_at).getTime() <= new Date(payment.paid_at).getTime())
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const buffer = await renderToBuffer(
      <ReceiptPdfDocument
        accountName={account.name}
        logoUrl={account.logoUrl}
        accentColor={account.quoteAccentColor}
        address={account.address}
        taxId={account.taxId}
        invoiceNumber={invoice.invoice_number}
        contactName={invoice.contact?.name || invoice.contact?.phone || "—"}
        contactPhone={invoice.contact?.phone ?? ""}
        paymentAmount={payment.amount}
        paymentMethod={payment.method}
        paidAt={new Date(payment.paid_at).toLocaleDateString("es-MX")}
        invoiceTotal={invoice.total}
        amountPaid={amountPaidToDate}
        currency={invoice.currency}
        notes={payment.notes ?? null}
      />,
    );

    const paidAtLabel = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long" }).format(new Date(payment.paid_at));

    const html = renderShellEmail({
      shell: pacienteShell(account.name, { logoUrl: account.logoUrl, accentColor: account.quoteAccentColor, chip: "PAGADA" }),
      heading: "Recibo de pago",
      blocks: [
        pSaludo(`Hola ${escapeHtml(invoice.contact.name || "")},`),
        pText("Recibimos tu pago. Adjuntamos el recibo correspondiente."),
        pDestacado("PAGADO", fmtMoney(payment.amount, invoice.currency), paidAtLabel, "verde"),
        pAdjunto(`Recibo-${invoice.invoice_number}.pdf`),
        pNota("Conserva este recibo como comprobante de tu pago."),
      ],
    });

    await sendEmail({
      to: invoice.contact.email,
      subject: `Recibo de pago — Factura ${invoice.invoice_number} — ${account.name}`,
      html,
      fromName: account.name,
      attachments: [{ filename: `Recibo-${invoice.invoice_number}.pdf`, content: buffer }],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
