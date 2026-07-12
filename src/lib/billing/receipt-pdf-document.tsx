// ============================================================
// ReceiptPdfDocument — server-only, same rendering path and
// branding rules as QuotePdfDocument (see that file's header
// comment). Renders a proof-of-payment for one `payments` row
// against an invoice — full or partial, method and date included,
// with the invoice's running balance so the patient sees what (if
// anything) is still owed.
// ============================================================

import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

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

const DEFAULT_ACCENT = "#0F3D1E";

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

function fmtMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function ReceiptPdfDocument(props: ReceiptPdfProps) {
  const accent = props.accentColor || DEFAULT_ACCENT;
  const remaining = Math.max(0, props.invoiceTotal - props.amountPaid);
  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
    logo: { width: 64, height: 64, objectFit: "contain" },
    accountName: { fontSize: 16, fontWeight: 700, color: accent },
    title: { fontSize: 20, fontWeight: 700, textAlign: "right" },
    meta: { fontSize: 9, color: "#666", textAlign: "right", marginTop: 4 },
    section: { marginBottom: 16 },
    label: { fontSize: 8, color: "#888", textTransform: "uppercase", marginBottom: 2 },
    value: { fontSize: 11 },
    issuerMeta: { fontSize: 8, color: "#888", marginTop: 2 },
    amountBlock: {
      marginTop: 8,
      alignItems: "center",
      paddingVertical: 20,
      borderTop: `1 solid ${accent}`,
      borderBottom: `1 solid ${accent}`,
    },
    amountLabel: { fontSize: 9, color: "#888", textTransform: "uppercase" },
    amountValue: { fontSize: 28, fontWeight: 700, color: accent, marginTop: 4 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
    summaryLabel: { color: "#666" },
    balanceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      marginTop: 4,
      borderTop: "1 solid #ddd",
    },
    balanceLabel: { fontSize: 11, fontWeight: 700 },
    balanceValue: { fontSize: 13, fontWeight: 700 },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML <img>; has no alt prop */}
            {props.logoUrl ? <Image src={props.logoUrl} style={styles.logo} /> : null}
            <Text style={[styles.accountName, { marginTop: props.logoUrl ? 6 : 0 }]}>
              {props.accountName}
            </Text>
            {props.address ? <Text style={styles.issuerMeta}>{props.address}</Text> : null}
            {props.taxId ? <Text style={styles.issuerMeta}>RFC: {props.taxId}</Text> : null}
          </View>
          <View>
            <Text style={styles.title}>Recibo de pago</Text>
            <Text style={styles.meta}>Factura {props.invoiceNumber}</Text>
            <Text style={styles.meta}>Fecha: {props.paidAt}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Recibido de</Text>
          <Text style={styles.value}>{props.contactName}</Text>
          {props.contactPhone ? <Text style={styles.value}>{props.contactPhone}</Text> : null}
        </View>

        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Monto recibido</Text>
          <Text style={styles.amountValue}>{fmtMoney(props.paymentAmount, props.currency)}</Text>
          <Text style={styles.issuerMeta}>{METHOD_LABELS[props.paymentMethod] ?? props.paymentMethod}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total de la factura</Text>
            <Text>{fmtMoney(props.invoiceTotal, props.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pagado a la fecha</Text>
            <Text>{fmtMoney(props.amountPaid, props.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Saldo pendiente</Text>
            <Text style={[styles.balanceValue, { color: remaining > 0 ? "#b45309" : accent }]}>
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
      </Page>
    </Document>
  );
}
