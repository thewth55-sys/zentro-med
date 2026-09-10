// ============================================================
// InvoicePdfDocument — server-only, same rendering path and
// branding rules as QuotePdfDocument (see that file's header
// comment). Adds a payment-status block (paid/balance due) that
// quotes don't need, since an invoice's whole point is tracking
// money owed.
// ============================================================

import { Document, Page, View, Text } from "@react-pdf/renderer";
import { createPdfStyles, fmtMoney, ZENTRO_GREEN } from "./pdf-theme";
import { PdfGradientHeader, PdfInfoGrid, PdfItemsTable, PdfTotalsBox, PdfFooter, type PdfInfoGridColumn } from "./pdf-components";

export interface InvoicePdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  toothNumber: number | null;
}

export interface InvoicePdfAttendedBy {
  name: string;
  specialty: string | null;
  roomName: string | null;
  appointmentDate: string | null;
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
  attendedBy: InvoicePdfAttendedBy | null;
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

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  partial: "Pago parcial",
  overdue: "Vencida",
  void: "Anulada",
};

export function InvoicePdfDocument(props: InvoicePdfProps) {
  const accent = props.accentColor || ZENTRO_GREEN;
  const balanceDue = Math.max(0, props.total - props.amountPaid);
  const styles = createPdfStyles(accent);
  const statusBg = balanceDue > 0 ? "#fde9c8" : "#d1fae5";
  const statusColor = balanceDue > 0 ? "#92400e" : "#065f46";

  const columns: PdfInfoGridColumn[] = [
    { label: "Facturar a", name: props.contactName, detail: [props.contactPhone] },
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
          docLabel="Factura"
          docNumber={props.invoiceNumber}
          metaLines={[`Fecha: ${props.issueDate}`, ...(props.dueDate ? [`Vence: ${props.dueDate}`] : [])]}
          statusPill={{ label: STATUS_LABEL[props.status] ?? props.status, bg: statusBg, color: statusColor }}
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
              { label: "Pagado", value: fmtMoney(props.amountPaid, props.currency) },
            ]}
            grandLabel="Total por pagar"
            grandValue={fmtMoney(balanceDue, props.currency)}
            sublineText={props.dueDate ? `Vence el ${props.dueDate}` : undefined}
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
          legalText="Este documento es un comprobante de gestión comercial y no constituye un comprobante fiscal digital por internet (CFDI)."
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
