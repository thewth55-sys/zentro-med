// ============================================================
// InvoicePdfDocument — server-only, same rendering path and
// branding rules as QuotePdfDocument (see that file's header
// comment). Adds a payment-status block (paid/balance due) that
// quotes don't need, since an invoice's whole point is tracking
// money owed.
// ============================================================

import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export interface InvoicePdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoicePdfProps {
  accountName: string;
  logoUrl: string | null;
  accentColor: string | null;
  address: string | null;
  taxId: string | null;
  quoteTerms: string | null;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  contactName: string;
  contactPhone: string;
  items: InvoicePdfLineItem[];
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  discountLabel: string | null;
  total: number;
  amountPaid: number;
  currency: string;
  notes: string | null;
}

const DEFAULT_ACCENT = "#0F3D1E";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  partial: "Pago parcial",
  overdue: "Vencida",
  void: "Anulada",
};

function fmtMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function InvoicePdfDocument(props: InvoicePdfProps) {
  const accent = props.accentColor || DEFAULT_ACCENT;
  const balanceDue = Math.max(0, props.total - props.amountPaid);
  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
    logo: { width: 64, height: 64, objectFit: "contain" },
    accountName: { fontSize: 16, fontWeight: 700, color: accent },
    title: { fontSize: 20, fontWeight: 700, textAlign: "right" },
    meta: { fontSize: 9, color: "#666", textAlign: "right", marginTop: 4 },
    statusBadge: {
      alignSelf: "flex-end",
      marginTop: 6,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 3,
      backgroundColor: balanceDue > 0 ? "#fef3c7" : "#d1fae5",
    },
    statusBadgeText: { fontSize: 8, fontWeight: 700, color: balanceDue > 0 ? "#92400e" : "#065f46" },
    section: { marginBottom: 16 },
    label: { fontSize: 8, color: "#888", textTransform: "uppercase", marginBottom: 2 },
    value: { fontSize: 11 },
    table: { marginTop: 8, borderTop: "1 solid #ddd" },
    tableHeaderRow: { flexDirection: "row", backgroundColor: accent, paddingVertical: 6, paddingHorizontal: 6 },
    tableHeaderCell: { fontSize: 8, color: "#fff", textTransform: "uppercase" },
    tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderBottom: "1 solid #eee" },
    tableCell: { fontSize: 9 },
    totalsBlock: { marginTop: 12, alignSelf: "flex-end", width: 220 },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      marginTop: 4,
      borderTop: `1 solid ${accent}`,
    },
    grandTotalLabel: { fontSize: 11, fontWeight: 700 },
    grandTotalValue: { fontSize: 13, fontWeight: 700, color: accent },
    balanceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      marginTop: 4,
      borderTop: "1 solid #ddd",
    },
    balanceLabel: { fontSize: 11, fontWeight: 700 },
    balanceValue: { fontSize: 13, fontWeight: 700, color: balanceDue > 0 ? "#b45309" : accent },
    terms: { marginTop: 28, paddingTop: 12, borderTop: "1 solid #ddd", fontSize: 8, color: "#666" },
    issuerMeta: { fontSize: 8, color: "#888", marginTop: 2 },
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
            <Text style={styles.title}>Factura</Text>
            <Text style={styles.meta}>{props.invoiceNumber}</Text>
            <Text style={styles.meta}>Fecha: {props.issueDate}</Text>
            {props.dueDate ? <Text style={styles.meta}>Vence: {props.dueDate}</Text> : null}
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{(STATUS_LABEL[props.status] ?? props.status).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Para</Text>
          <Text style={styles.value}>{props.contactName}</Text>
          {props.contactPhone ? <Text style={styles.value}>{props.contactPhone}</Text> : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: "46%" }]}>Descripción</Text>
            <Text style={[styles.tableHeaderCell, { width: "14%", textAlign: "right" }]}>Cant.</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "right" }]}>P. unitario</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "right" }]}>Total</Text>
          </View>
          {props.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "46%" }]}>{item.description}</Text>
              <Text style={[styles.tableCell, { width: "14%", textAlign: "right" }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}>
                {fmtMoney(item.unitPrice, props.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}>
                {fmtMoney(item.lineTotal, props.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{fmtMoney(props.subtotal, props.currency)}</Text>
          </View>
          {props.discountAmount > 0 ? (
            <View style={styles.totalsRow}>
              <Text>Descuento{props.discountLabel ? ` (${props.discountLabel})` : ""}</Text>
              <Text>-{fmtMoney(props.discountAmount, props.currency)}</Text>
            </View>
          ) : null}
          <View style={styles.totalsRow}>
            <Text>Impuestos</Text>
            <Text>{fmtMoney(props.taxTotal, props.currency)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{fmtMoney(props.total, props.currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Pagado</Text>
            <Text>{fmtMoney(props.amountPaid, props.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Saldo pendiente</Text>
            <Text style={styles.balanceValue}>{fmtMoney(balanceDue, props.currency)}</Text>
          </View>
        </View>

        {props.notes ? (
          <View style={styles.section}>
            <Text style={styles.label}>Notas</Text>
            <Text style={styles.value}>{props.notes}</Text>
          </View>
        ) : null}

        {props.quoteTerms ? (
          <View style={styles.terms}>
            <Text>{props.quoteTerms}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
