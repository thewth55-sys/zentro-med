// ============================================================
// QuotePdfDocument — server-only. Rendered via
// @react-pdf/renderer's renderToBuffer() from the pdf route, never
// imported by a client component (it pulls in @react-pdf/renderer's
// Node-side layout engine).
//
// Branding is entirely account-driven: accounts.logo_url (falls back
// to no image — NOT the Zentro Med isotipo, since this document
// represents the CLINIC's brand to ITS patient, not Zentro Med's),
// accounts.quote_accent_color (falls back to Zentro's brand green),
// accounts.quote_terms (omitted entirely when blank).
// ============================================================

import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export interface QuotePdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface QuotePdfProps {
  accountName: string;
  logoUrl: string | null;
  accentColor: string | null;
  address: string | null;
  taxId: string | null;
  quoteTerms: string | null;
  quoteNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string | null;
  contactName: string;
  contactPhone: string;
  items: QuotePdfLineItem[];
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  discountLabel: string | null;
  total: number;
  currency: string;
  notes: string | null;
}

const DEFAULT_ACCENT = "#0F3D1E";

function fmtMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function QuotePdfDocument(props: QuotePdfProps) {
  const accent = props.accentColor || DEFAULT_ACCENT;
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
            <Text style={styles.title}>Cotización</Text>
            <Text style={styles.meta}>{props.quoteNumber}</Text>
            <Text style={styles.meta}>Fecha: {props.issueDate}</Text>
            {props.expiryDate ? <Text style={styles.meta}>Vence: {props.expiryDate}</Text> : null}
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
