import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadActivePaymentGatewayConfig } from "@/lib/payments/config";
import { getPaymentAdapter } from "@/lib/payments/gateway";

/**
 * POST /api/billing/invoices/[id]/checkout-link — generates a real
 * Stripe/Mercado Pago/Clip checkout link for an EXISTING invoice's
 * outstanding balance (not a booking deposit — see migration 111's
 * comment for why this needed its own table instead of reusing
 * appointment_deposits). Reuses the same gateway config/adapter the
 * public booking deposit flow already relies on
 * (loadActivePaymentGatewayConfig + getPaymentAdapter), just pointed
 * at an invoice instead of an appointment.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, accountId, userId } = await requireRole("agent");
    const { id } = await params;

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, amount_paid, currency, status, contact:contacts(name, phone, email)")
      .eq("id", id)
      .eq("account_id", accountId)
      .maybeSingle();
    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.status === "void" || invoice.status === "paid") {
      return NextResponse.json({ error: "This invoice has no outstanding balance to collect" }, { status: 400 });
    }

    const outstanding = Number(invoice.total) - Number(invoice.amount_paid);
    if (!(outstanding > 0)) {
      return NextResponse.json({ error: "This invoice has no outstanding balance to collect" }, { status: 400 });
    }

    const gatewayConfig = await loadActivePaymentGatewayConfig(supabase, accountId);
    if (!gatewayConfig || !gatewayConfig.isActive) {
      return NextResponse.json({ error: "No active payment gateway is configured for this account" }, { status: 400 });
    }

    const { data: checkoutRow, error: insertError } = await supabase
      .from("invoice_checkouts")
      .insert({
        account_id: accountId,
        invoice_id: invoice.id,
        provider: gatewayConfig.provider,
        amount: outstanding,
        currency: invoice.currency,
        created_by: userId,
      })
      .select("id, external_reference")
      .single();
    if (insertError || !checkoutRow) {
      console.error("[checkout-link POST] insert error:", insertError);
      return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://med.zentrolabs.com";
    const contact = Array.isArray(invoice.contact) ? invoice.contact[0] : invoice.contact;

    try {
      const result = await getPaymentAdapter(gatewayConfig.provider).createCheckout(gatewayConfig.credentials, {
        amount: outstanding,
        currency: invoice.currency,
        description: `Factura ${invoice.invoice_number}`,
        externalReference: checkoutRow.external_reference,
        successUrl: `${siteUrl}/?pago=exitoso`,
        cancelUrl: `${siteUrl}/?pago=cancelado`,
        webhookUrl: `${siteUrl}/api/webhooks/payments/${gatewayConfig.provider}/${accountId}`,
        customerName: contact?.name || undefined,
        customerPhone: contact?.phone || undefined,
        customerEmail: contact?.email || undefined,
      });

      await supabase
        .from("invoice_checkouts")
        .update({ checkout_url: result.checkoutUrl, external_checkout_id: result.externalCheckoutId })
        .eq("id", checkoutRow.id);

      return NextResponse.json({ checkoutUrl: result.checkoutUrl });
    } catch (err) {
      console.error("[checkout-link POST] createCheckout failed:", err);
      await supabase.from("invoice_checkouts").update({ status: "failed" }).eq("id", checkoutRow.id);
      return NextResponse.json({ error: "Failed to create the payment link" }, { status: 502 });
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
