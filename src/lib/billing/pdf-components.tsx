// ============================================================
// Shared @react-pdf/renderer sub-components for the invoice/quote/
// receipt documents. Extracted because the restyled header/info-grid/
// table-header/totals-box JSX is meaningfully more complex than the
// old flat layout each document used to inline on its own — tripling
// it would be the first real structural duplication in this module
// (the theme file already centralizes styling; this centralizes the
// markup that consumes it).
//
// Each component takes the `styles` object from `createPdfStyles`
// plus the resolved `accent` color (needed for the SVG gradient,
// which can't be expressed as a StyleSheet color prop).
// ============================================================

import { View, Text, Image, Svg, Defs, RadialGradient, Stop, Circle } from "@react-pdf/renderer";
import type { createPdfStyles } from "./pdf-theme";

type PdfStyles = ReturnType<typeof createPdfStyles>;

export interface PdfStatusPill {
  label: string;
  bg: string;
  color: string;
}

export function PdfGradientHeader(props: {
  styles: PdfStyles;
  accent: string;
  accountName: string;
  logoUrl: string | null;
  address?: string | null;
  taxId?: string | null;
  docLabel: string;
  docNumber: string;
  metaLines?: string[];
  statusPill?: PdfStatusPill | null;
}) {
  const { styles } = props;
  const gradientId = "headerGradient";

  return (
    <View style={styles.headerBand} fixed>
      <View style={styles.headerGradientSvg}>
        <Svg width="260" height="140" viewBox="0 0 260 140">
          <Defs>
            <RadialGradient id={gradientId} cx="70%" cy="30%" r="75%">
              <Stop offset="0" stopColor={props.accent} stopOpacity={0.55} />
              <Stop offset="1" stopColor={props.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="190" cy="40" r="150" fill={`url(#${gradientId})`} />
        </Svg>
      </View>
      <View style={styles.headerRow}>
        <View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML <img>; has no alt prop */}
          {props.logoUrl ? <Image src={props.logoUrl} style={styles.logoOnHeader} /> : null}
          <Text style={[styles.accountNameOnHeader, { marginTop: props.logoUrl ? 8 : 0 }]}>
            {props.accountName}
          </Text>
          {props.address ? <Text style={styles.issuerMetaOnHeader}>{props.address}</Text> : null}
          {props.taxId ? <Text style={styles.issuerMetaOnHeader}>RFC: {props.taxId}</Text> : null}
        </View>
        <View>
          <Text style={styles.docLabelOnHeader}>{props.docLabel}</Text>
          <Text style={styles.docNumberOnHeader}>{props.docNumber}</Text>
          {(props.metaLines ?? []).map((line, i) => (
            <Text key={i} style={styles.metaOnHeader}>
              {line}
            </Text>
          ))}
          {props.statusPill ? (
            <View style={[styles.statusPill, { backgroundColor: props.statusPill.bg }]}>
              <Text style={[styles.statusPillText, { color: props.statusPill.color }]}>
                {props.statusPill.label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export interface PdfInfoGridColumn {
  label: string;
  name: string;
  detail: string[];
}

export function PdfInfoGrid(props: { styles: PdfStyles; columns: PdfInfoGridColumn[] }) {
  const { styles } = props;
  return (
    <View style={styles.infoGrid}>
      {props.columns.map((col, i) => (
        <View key={i} style={styles.infoGridColumn}>
          <Text style={styles.infoGridLabel}>{col.label}</Text>
          <Text style={styles.infoGridName}>{col.name}</Text>
          {col.detail.filter(Boolean).map((line, j) => (
            <Text key={j} style={styles.infoGridDetail}>
              {line}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export interface PdfTableColumn {
  key: string;
  label: string;
  width: string;
  align?: "left" | "right";
}

export interface PdfTableRow {
  cells: Record<string, string>;
  subtitle?: string | null;
}

export function PdfItemsTable(props: { styles: PdfStyles; columns: PdfTableColumn[]; rows: PdfTableRow[] }) {
  const { styles, columns } = props;
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRowLight}>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[styles.tableHeaderCellLight, { width: col.width, textAlign: col.align ?? "left" }]}
          >
            {col.label}
          </Text>
        ))}
      </View>
      {props.rows.map((row, i) => (
        <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
          {columns.map((col, j) => (
            <View key={col.key} style={{ width: col.width }}>
              <Text style={[styles.tableCell, { textAlign: col.align ?? "left" }]}>{row.cells[col.key] ?? ""}</Text>
              {j === 0 && row.subtitle ? <Text style={styles.tableRowSubtitle}>{row.subtitle}</Text> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export interface PdfTotalsRowSpec {
  label: string;
  value: string;
  tone?: "default" | "negative";
}

export function PdfTotalsBox(props: {
  styles: PdfStyles;
  rows: PdfTotalsRowSpec[];
  grandLabel: string;
  grandValue: string;
  sublineText?: string | null;
}) {
  const { styles } = props;
  return (
    <View>
      {props.rows.map((row, i) => (
        <View key={i} style={styles.totalsRow}>
          <Text style={styles.totalsRowLabel}>{row.label}</Text>
          <Text style={row.tone === "negative" ? { color: "#b45309" } : undefined}>{row.value}</Text>
        </View>
      ))}
      <View style={styles.totalsBoxBold}>
        <Text style={styles.totalsBoxLabel}>{props.grandLabel}</Text>
        <Text style={styles.totalsBoxValue}>{props.grandValue}</Text>
        {props.sublineText ? <Text style={styles.totalsBoxSubline}>{props.sublineText}</Text> : null}
      </View>
    </View>
  );
}

export function PdfFooter(props: { styles: PdfStyles; legalText: string; brandLabel: string; generatedAtLabel: string }) {
  const { styles } = props;
  return (
    <View style={styles.footerRow} fixed>
      <Text style={styles.footerLegal}>{props.legalText}</Text>
      <View>
        <Text style={styles.footerBrand}>{props.brandLabel}</Text>
        <Text style={styles.footerBrand}>{props.generatedAtLabel}</Text>
      </View>
    </View>
  );
}
