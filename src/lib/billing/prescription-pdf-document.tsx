// ============================================================
// PrescriptionPdfDocument — server-only, same rendering path and
// shared building blocks as InvoicePdfDocument/ReceiptPdfDocument
// (see pdf-theme.ts / pdf-components.tsx). Legal citation text
// (`legalText` in PdfFooter) branches on `countryAtIssue` — set once
// at issuance (132_prescriptions.sql), never re-derived from the
// account's live country so a signed prescription never
// retroactively changes its legal framework.
// ============================================================

import { Document, Page, View, Text, StyleSheet, Image, Svg, Path } from "@react-pdf/renderer";
import { createPdfStyles, ZENTRO_GREEN } from "./pdf-theme";
import { PdfGradientHeader, PdfInfoGrid, PdfFooter } from "./pdf-components";
import {
  prescriptionDocTitle,
  prescriptionLegalText,
} from "@/lib/clinical/prescription-types";
import type { AccountCountry } from "@/lib/country";

export interface PrescriptionPdfItem {
  genericName: string;
  concentration: string | null;
  brandName: string | null;
  presentation: string | null;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  duration: string | null;
  quantityToDispense: string | null;
}

export interface PrescriptionPdfProps {
  accountName: string;
  logoUrl: string | null;
  accentColor: string | null;
  address: string | null;
  doctorName: string;
  doctorLicense: string | null;
  doctorLicenseInstitution: string | null;
  /** Signed URL to the doctor's captured autograph (133_doctor_signature.sql) — falls back to a placeholder line when not yet set up. */
  signatureImageUrl: string | null;
  folio: string;
  issuedAt: string;
  countryAtIssue: AccountCountry;
  patientName: string;
  patientDocument: string | null;
  patientAge: string | null;
  allergyBanner: string | null;
  items: PrescriptionPdfItem[];
  indications: string | null;
}

export function PrescriptionPdfDocument(props: PrescriptionPdfProps) {
  const accent = props.accentColor || ZENTRO_GREEN;
  const styles = createPdfStyles(accent);
  const rxStyles = StyleSheet.create({
    rxHeader: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 14, marginBottom: 6 },
    rxSymbol: { fontSize: 16, fontWeight: 700 },
    itemBlock: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#EDF1EF" },
    itemTitle: { fontSize: 12, fontWeight: 700 },
    itemMeta: { fontSize: 9, color: "#5B6B62", marginTop: 2 },
    banner: {
      marginTop: 8,
      marginBottom: 8,
      padding: 8,
      borderRadius: 4,
      backgroundColor: "#FCEDEA",
    },
    bannerText: { fontSize: 9, color: "#B3382C" },
    signatureBlock: {
      marginTop: 18,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: "#E6EBE8",
      paddingTop: 10,
    },
    signatureImage: { height: 34, objectFit: "contain" },
    signatureName: { fontSize: 10, fontWeight: 700, marginTop: 4 },
    signatureMeta: { fontSize: 8, color: "#5B6B62", marginTop: 2 },
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
          taxId={null}
          docLabel={prescriptionDocTitle(props.countryAtIssue)}
          docNumber={props.folio}
          metaLines={[`Fecha: ${props.issuedAt}`, props.doctorLicense ?? ""].filter(Boolean)}
        />

        <PdfInfoGrid
          styles={styles}
          columns={[
            {
              label: "Paciente",
              name: props.patientName,
              detail: [props.patientDocument, props.patientAge].filter((v): v is string => Boolean(v)),
            },
            {
              label: "Prescriptor",
              name: props.doctorName,
              detail: [props.doctorLicense, props.doctorLicenseInstitution].filter(
                (v): v is string => Boolean(v),
              ),
            },
          ]}
        />

        {props.allergyBanner ? (
          <View style={rxStyles.banner}>
            <Text style={rxStyles.bannerText}>{props.allergyBanner}</Text>
          </View>
        ) : null}

        <View style={rxStyles.rxHeader}>
          <Text style={rxStyles.rxSymbol}>℞</Text>
          <Text style={styles.label}>PRESCRIPCIÓN</Text>
        </View>

        {props.items.map((item, i) => (
          <View key={i} style={rxStyles.itemBlock}>
            <Text style={rxStyles.itemTitle}>
              {i + 1}. {item.genericName} {item.concentration ?? ""}
              {item.brandName ? ` · ${item.brandName}` : ""}
            </Text>
            {item.presentation ? <Text style={rxStyles.itemMeta}>{item.presentation}</Text> : null}
            <Text style={rxStyles.itemMeta}>
              {[item.dose, item.route, item.frequency, item.duration].filter(Boolean).join(" · ")}
            </Text>
            {item.quantityToDispense ? (
              <Text style={rxStyles.itemMeta}>Cantidad a surtir: {item.quantityToDispense}</Text>
            ) : null}
          </View>
        ))}

        {props.indications ? (
          <View style={styles.section}>
            <Text style={styles.label}>Indicaciones para el paciente</Text>
            <Text style={styles.value}>{props.indications}</Text>
          </View>
        ) : null}

        <View style={rxStyles.signatureBlock}>
          {props.signatureImageUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML <img>; has no alt prop
            <Image src={props.signatureImageUrl} style={rxStyles.signatureImage} />
          ) : (
            <Svg width={160} height={34} viewBox="0 0 160 34">
              <Path
                d="M6 24c9-12 13 4 20-4s9 7 16-2 10 6 17-4 10 6 16-2 12 6 20-4"
                stroke="#0C1B14"
                strokeWidth={1.4}
                fill="none"
              />
            </Svg>
          )}
          <Text style={rxStyles.signatureName}>{props.doctorName}</Text>
          <Text style={rxStyles.signatureMeta}>
            {[props.doctorLicense, props.doctorLicenseInstitution].filter(Boolean).join(" · ")}
          </Text>
        </View>

        <PdfFooter
          styles={styles}
          legalText={prescriptionLegalText(props.countryAtIssue)}
          brandLabel={props.accountName}
          generatedAtLabel={`Generado el ${new Date().toLocaleString("es-MX")}`}
        />
      </Page>
    </Document>
  );
}
