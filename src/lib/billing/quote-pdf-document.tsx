// ============================================================
// QuotePdfDocument — server-only. Rendered via
// @react-pdf/renderer's renderToBuffer() from the pdf route, never
// imported by a client component (it pulls in @react-pdf/renderer's
// Node-side layout engine).
//
// Branding is entirely account-driven: accounts.logo_url (falls back
// to no image — NOT the Zentro Med isotipo, since this document
// represents the CLINIC's brand to ITS patient, not Zentro Med's),
// accounts.quote_accent_color (falls back to Zentro's real brand
// green — see pdf-theme.ts), accounts.quote_terms (omitted entirely
// when blank).
// ============================================================

import { Document, Page, View, Text } from "@react-pdf/renderer";
import { createPdfStyles, fmtMoney, ZENTRO_GREEN } from "./pdf-theme";
import { PdfGradientHeader, PdfInfoGrid, PdfItemsTable, PdfTotalsBox, PdfFooter, type PdfInfoGridColumn } from "./pdf-components";

export interface QuotePdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  toothNumber: number | null;
}

export interface QuotePdfAttendedBy {
  name: string;
  specialty: string | null;
  roomName: string | null;
  appointmentDate: string | null;
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
  attendedBy: QuotePdfAttendedBy | null;
  items: QuotePdfLineItem[];
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  discountLabel: string | null;
  total: number;
  currency: string;
  notes: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Vencida",
  converted: "Convertida",
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#e5e7eb", color: "#374151" },
  sent: { bg: "#fde9c8", color: "#92400e" },
  accepted: { bg: "#d1fae5", color: "#065f46" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
  expired: { bg: "#fee2e2", color: "#991b1b" },
  converted: { bg: "#d1fae5", color: "#065f46" },
};

export function QuotePdfDocument(props: QuotePdfProps) {
  const accent = props.accentColor || ZENTRO_GREEN;
  const styles = createPdfStyles(accent);
  const statusColors = STATUS_COLORS[props.status] ?? STATUS_COLORS.draft;

  const columns: PdfInfoGridColumn[] = [
    { label: "Cotizar a", name: props.contactName, detail: [props.contactPhone] },
  ];
  if (props.attendedBy) {
    columns.push({
      label: "Atendió",
      name: props.attendedBy.name,
      detail: [
        props.attendedBy.specialty,
        props.attendedBy.roomName,
        props.attendedBy.appointmentDate ? `Cita del ${props.attendedBy.appointmentDate}` : null,
      ].filter((v): v is string => Boolean(v)),
    });
  }
  columns.push({
    label: "Emite",
    name: props.accountName,
    detail: [props.address, props.taxId ? `RFC: ${props.taxId}` : null].filter((v): v is string => Boolean(v)),
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfGradientHeader
          styles={styles}
          accent={accent}
          accountName={props.accountName}
          logoUrl={props.logoUrl}
          docLabel="Cotización"
          docNumber={props.quoteNumber}
          metaLines={[`Fecha: ${props.issueDate}`, ...(props.expiryDate ? [`Válida hasta: ${props.expiryDate}`] : [])]}
          statusPill={{ label: STATUS_LABEL[props.status] ?? props.status, ...statusColors }}
        />

        <PdfInfoGrid styles={styles} columns={columns} />

        <PdfItemsTable
          styles={styles}
          columns={[
            { key: "description", label: "Concepto", width: "40%" },
            { key: "tooth", label: "Diente", width: "12%", align: "right" },
            { key: "quantity", label: "Cant.", width: "12%", align: "right" },
            { key: "unitPrice", label: "P. unitario", width: "18%", align: "right" },
            { key: "total", label: "Importe", width: "18%", align: "right" },
          ]}
          rows={props.items.map((item) => ({
            cells: {
              description: item.description,
              tooth: item.toothNumber != null ? String(item.toothNumber) : "—",
              quantity: String(item.quantity),
              unitPrice: fmtMoney(item.unitPrice, props.currency),
              total: fmtMoney(item.lineTotal, props.currency),
            },
          }))}
        />

        <View style={{ marginTop: 12 }}>
          <PdfTotalsBox
            styles={styles}
            rows={[
              { label: "Subtotal", value: fmtMoney(props.subtotal, props.currency) },
              ...(props.discountAmount > 0
                ? [
                    {
                      label: `Descuento${props.discountLabel ? ` (${props.discountLabel})` : ""}`,
                      value: `-${fmtMoney(props.discountAmount, props.currency)}`,
                      tone: "negative" as const,
                    },
                  ]
                : []),
              { label: "Impuestos", value: fmtMoney(props.taxTotal, props.currency) },
            ]}
            grandLabel="Total"
            grandValue={fmtMoney(props.total, props.currency)}
            sublineText={props.expiryDate ? `Válida hasta: ${props.expiryDate}` : undefined}
          />
        </View>

        {props.notes ? (
          <View style={styles.section}>
            <Text style={styles.label}>Notas</Text>
            <Text style={styles.value}>{props.notes}</Text>
          </View>
        ) : null}

        <PdfFooter
          styles={styles}
          legalText="Este documento es una cotización de gestión comercial y no constituye un comprobante fiscal digital por internet (CFDI)."
          brandLabel={props.accountName}
          generatedAtLabel={`Generado el ${new Date().toLocaleString("es-MX")}`}
        />

        {props.quoteTerms ? (
          <View style={styles.terms}>
            <Text>{props.quoteTerms}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
