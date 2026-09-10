// ============================================================
// ReceiptPdfDocument — server-only, same rendering path and
// branding rules as QuotePdfDocument (see that file's header
// comment). Renders a proof-of-payment for one `payments` row
// against an invoice — full or partial, method and date included,
// with the invoice's running balance so the patient sees what (if
// anything) is still owed.
// ============================================================

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { createPdfStyles, fmtMoney, ZENTRO_GREEN, ZENTRO_GREEN_DARK, lighten } from "./pdf-theme";
import { PdfGradientHeader, PdfInfoGrid, PdfFooter } from "./pdf-components";

export interface ReceiptPdfProps {
  accountName: string;
  logoUrl: string | null;
  accentColor: string | null;
  address: string | null;
  taxId: string | null;
  invoiceNumber: string;
  contactName: string;
  contactPhone: string;
  paymentAmount: number;
  paymentMethod: string;
  paidAt: string;
  invoiceTotal: number;
  amountPaid: number;
  currency: string;
  notes: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

export function ReceiptPdfDocument(props: ReceiptPdfProps) {
  const accent = props.accentColor || ZENTRO_GREEN;
  const remaining = Math.max(0, props.invoiceTotal - props.amountPaid);
  const fullyPaid = remaining <= 0;
  const styles = createPdfStyles(accent);
  const receiptStyles = StyleSheet.create({
    amountBlock: {
      marginTop: 4,
      marginBottom: 18,
      alignItems: "center",
      paddingVertical: 24,
      borderRadius: 6,
      backgroundColor: lighten(accent, 0.92),
    },
    amountLabel: { fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 },
    amountValue: { fontSize: 30, fontWeight: 700, color: ZENTRO_GREEN_DARK, marginTop: 6 },
    amountMethod: { fontSize: 9, color: "#888", marginTop: 4 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
    summaryLabel: { color: "#666" },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfGradientHeader
          styles={styles}
          accent={accent}
          accountName={props.accountName}
          logoUrl={props.logoUrl}
          address={props.address}
          taxId={props.taxId}
          docLabel="Recibo"
          docNumber={`Factura ${props.invoiceNumber}`}
          metaLines={[`Fecha: ${props.paidAt}`]}
          statusPill={
            fullyPaid
              ? { label: "Pago recibido", bg: "#d1fae5", color: "#065f46" }
              : { label: "Pago parcial", bg: "#fde9c8", color: "#92400e" }
          }
        />

        <PdfInfoGrid
          styles={styles}
          columns={[
            { label: "Recibido de", name: props.contactName, detail: [props.contactPhone] },
            {
              label: "Emite",
              name: props.accountName,
              detail: [props.address, props.taxId ? `RFC: ${props.taxId}` : null].filter(
                (v): v is string => Boolean(v),
              ),
            },
          ]}
        />

        <View style={receiptStyles.amountBlock}>
          <Text style={receiptStyles.amountLabel}>Monto recibido</Text>
          <Text style={receiptStyles.amountValue}>{fmtMoney(props.paymentAmount, props.currency)}</Text>
          <Text style={receiptStyles.amountMethod}>
            {METHOD_LABELS[props.paymentMethod] ?? props.paymentMethod}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={receiptStyles.summaryRow}>
            <Text style={receiptStyles.summaryLabel}>Total de la factura</Text>
            <Text>{fmtMoney(props.invoiceTotal, props.currency)}</Text>
          </View>
          <View style={receiptStyles.summaryRow}>
            <Text style={receiptStyles.summaryLabel}>Pagado a la fecha</Text>
            <Text>{fmtMoney(props.amountPaid, props.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Saldo pendiente</Text>
            <Text style={[styles.grandTotalValue, { color: remaining > 0 ? "#b45309" : ZENTRO_GREEN_DARK }]}>
              {fmtMoney(remaining, props.currency)}
            </Text>
          </View>
        </View>

        {props.notes ? (
          <View style={styles.section}>
            <Text style={styles.label}>Notas</Text>
            <Text style={styles.value}>{props.notes}</Text>
          </View>
        ) : null}

        <PdfFooter
          styles={styles}
          legalText="Este documento es un comprobante de gestión comercial y no constituye un comprobante fiscal digital por internet (CFDI)."
          brandLabel={props.accountName}
          generatedAtLabel={`Generado el ${new Date().toLocaleString("es-MX")}`}
        />
      </Page>
    </Document>
  );
}
