// ============================================================
// Shared @react-pdf/renderer styling for quote/invoice/receipt PDFs.
// Server-only, same posture as the documents that import it.
//
// ZENTRO_GREEN/ZENTRO_GREEN_DARK/ZENTRO_GREEN_FOREGROUND are the
// REAL brand colors, hand-derived earlier from globals.css's
// `html[data-theme="zentro"]` OKLCH values — NOT a guess. They're
// the fallback ONLY: every document actually branding-drives off
// `accounts.quote_accent_color` when the account has set one (this
// is the CLINIC's document to ITS patient, not a Zentro Med
// marketing asset), same as before this redesign.
// ============================================================

import { StyleSheet } from "@react-pdf/renderer";

export const ZENTRO_GREEN = "#4ade5a";
export const ZENTRO_GREEN_DARK = "#1b5a2e";
export const ZENTRO_GREEN_FOREGROUND = "#001f08";

export function fmtMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Darkens a #rrggbb hex color by `amount` (0-1) toward black — used to
 *  derive the gradient header's base from the account's accent color,
 *  since the accent itself (often a light/mid brand green) is too
 *  bright to hold white header text at good contrast. */
export function darken(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 0xff) * (1 - amount));
  const r = channel(16);
  const g = channel(8);
  const b = channel(0);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Lightens a #rrggbb hex color by `amount` (0-1) toward white — used
 *  for pale accent-tinted backgrounds (e.g. the receipt's "amount
 *  received" block), the inverse of `darken` above. */
export function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (255 - c) * amount);
  };
  const r = channel(16);
  const g = channel(8);
  const b = channel(0);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Builds the shared style set for one document, parameterized by the
 * resolved accent color (account's own color, or the Zentro green
 * fallback). Kept as a function (not a static StyleSheet) because
 * several styles depend on the runtime accent value.
 */
export function createPdfStyles(accent: string) {
  return StyleSheet.create({
    page: { paddingTop: 0, paddingBottom: 40, paddingHorizontal: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
    topBar: { height: 6, backgroundColor: accent, marginBottom: 32 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
    logo: { width: 60, height: 60, objectFit: "contain" },
    accountName: { fontSize: 15, fontWeight: 700, color: ZENTRO_GREEN_DARK },
    issuerMeta: { fontSize: 8, color: "#888", marginTop: 2 },
    title: { fontSize: 22, fontWeight: 700, textAlign: "right", letterSpacing: 0.3 },
    titleUnderline: { height: 2, width: 48, backgroundColor: accent, alignSelf: "flex-end", marginTop: 4, marginBottom: 6 },
    meta: { fontSize: 9, color: "#666", textAlign: "right", marginTop: 2 },
    statusBadge: {
      alignSelf: "flex-end",
      marginTop: 8,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 3,
    },
    statusBadgeText: { fontSize: 8, fontWeight: 700 },
    infoBox: {
      marginBottom: 18,
      padding: 10,
      borderRadius: 4,
      backgroundColor: "#f7f7f7",
    },
    label: { fontSize: 8, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
    value: { fontSize: 11, lineHeight: 1.4 },
    table: { marginTop: 4, borderRadius: 4, overflow: "hidden" },
    tableHeaderRow: { flexDirection: "row", backgroundColor: accent, paddingVertical: 7, paddingHorizontal: 8 },
    tableHeaderCell: { fontSize: 8, color: ZENTRO_GREEN_FOREGROUND, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.3 },
    tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottom: "1 solid #eee" },
    tableRowAlt: { backgroundColor: "#fafafa" },
    tableCell: { fontSize: 9 },
    totalsCard: {
      marginTop: 16,
      alignSelf: "flex-end",
      width: 240,
      padding: 12,
      borderRadius: 4,
      backgroundColor: "#f7f7f7",
    },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    totalsRowLabel: { color: "#666" },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 8,
      marginTop: 6,
      borderTop: `1 solid ${accent}`,
    },
    grandTotalLabel: { fontSize: 11, fontWeight: 700 },
    grandTotalValue: { fontSize: 15, fontWeight: 700, color: ZENTRO_GREEN_DARK },
    balanceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 8,
      marginTop: 6,
      borderTop: "1 solid #ddd",
    },
    balanceLabel: { fontSize: 11, fontWeight: 700 },
    section: { marginBottom: 16 },
    terms: { marginTop: 28, paddingTop: 12, borderTop: "1 solid #ddd", fontSize: 8, color: "#888", lineHeight: 1.5 },

    // --- Gradient header band (PdfGradientHeader) ---
    headerBand: {
      position: "relative",
      paddingHorizontal: 40,
      paddingTop: 28,
      paddingBottom: 20,
      marginHorizontal: -40,
      marginBottom: 24,
      backgroundColor: darken(accent, 0.55),
      overflow: "hidden",
    },
    headerGradientSvg: { position: "absolute", top: 0, right: 0, bottom: 0, width: 260 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    logoOnHeader: { width: 44, height: 44, objectFit: "contain" },
    accountNameOnHeader: { fontSize: 15, fontWeight: 700, color: "#ffffff" },
    issuerMetaOnHeader: { fontSize: 8, color: "rgba(255,255,255,0.72)", marginTop: 2 },
    docLabelOnHeader: {
      fontSize: 8,
      color: "rgba(255,255,255,0.72)",
      textTransform: "uppercase",
      letterSpacing: 1,
      textAlign: "right",
    },
    docNumberOnHeader: { fontSize: 20, fontWeight: 700, color: "#ffffff", textAlign: "right", marginTop: 2 },
    metaOnHeader: { fontSize: 8, color: "rgba(255,255,255,0.72)", textAlign: "right", marginTop: 3 },

    // --- Status pill (generalizes the old statusBadge) ---
    statusPill: { alignSelf: "flex-end", marginTop: 8, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
    statusPillText: { fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 },

    // --- Multi-column info grid (PdfInfoGrid) ---
    infoGrid: { flexDirection: "row", marginBottom: 20 },
    infoGridColumn: { flex: 1, paddingRight: 12 },
    infoGridLabel: { fontSize: 7.5, color: "#999", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
    infoGridName: { fontSize: 10.5, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 },
    infoGridDetail: { fontSize: 8.5, color: "#777", lineHeight: 1.4 },

    // --- Table header/subtitle refresh (light row, gray small-caps) ---
    tableHeaderRowLight: {
      flexDirection: "row",
      backgroundColor: "#fafafa",
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderBottom: "1 solid #eee",
    },
    tableHeaderCellLight: { fontSize: 7.5, color: "#999", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 },
    tableRowSubtitle: { fontSize: 7.5, color: "#999", marginTop: 1 },

    // --- Bold filled totals box (PdfTotalsBox) ---
    totalsBoxBold: {
      marginTop: 14,
      alignSelf: "flex-end",
      width: 220,
      padding: 14,
      borderRadius: 6,
      backgroundColor: darken(accent, 0.45),
    },
    totalsBoxLabel: { fontSize: 7.5, color: "rgba(255,255,255,0.72)", textTransform: "uppercase", letterSpacing: 0.8 },
    totalsBoxValue: { fontSize: 20, fontWeight: 700, color: "#ffffff", marginTop: 4 },
    totalsBoxSubline: { fontSize: 7.5, color: "rgba(255,255,255,0.72)", marginTop: 4 },

    // --- Footer (PdfFooter) ---
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginTop: 28,
      paddingTop: 12,
      borderTop: "1 solid #eee",
    },
    footerLegal: { fontSize: 7, color: "#aaa", lineHeight: 1.5, width: "70%" },
    footerBrand: { fontSize: 8, color: "#999", textAlign: "right" },
  });
}
