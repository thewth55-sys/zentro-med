// ============================================================
// Server-side only — embeds a patient's signature image, name, signed
// date, and any staff-defined custom text fields onto an existing PDF
// template, each at its own independently-configured position
// (migration 075's consent_templates/consent_documents.stamp_fields).
// Does NOT rewrite any other text in the document — see migration
// 074's module comment for why (PDFs aren't easily editable like a
// Word doc; only these elements' positions are configurable per
// template). custom_text fields carry their own `value`, filled in
// per-patient when the document was created from the template (see
// consent-forms-tab.tsx) — unlike signer_name/signed_date, which are
// only known here, at signing time.
// ============================================================

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { StampField } from "@/types";

export interface StampSignatureParams {
  pdfBytes: Uint8Array;
  signaturePngBytes: Uint8Array;
  signerName: string;
  signedAt: Date;
  fields: StampField[];
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

export async function stampSignatureOntoPdf(params: StampSignatureParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(params.pdfBytes);
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error("The PDF template has no pages");
  }

  const signatureImage = await pdfDoc.embedPng(params.signaturePngBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const dateLabel = DATE_FORMATTER.format(params.signedAt);

  for (const field of params.fields) {
    const pageIndex = Math.min(Math.max(field.page - 1, 0), pages.length - 1);
    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    const x = width * field.x;
    const y = height * field.y;

    if (field.type === "signature") {
      // Sized relative to the page so it looks consistent across
      // differently-sized PDFs (letter, A4, etc.).
      const sigWidth = width * 0.28;
      const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
      page.drawImage(signatureImage, { x, y, width: sigWidth, height: sigHeight });
    } else {
      const text =
        field.type === "signer_name" ? params.signerName : field.type === "signed_date" ? dateLabel : field.value ?? "";
      page.drawText(text, { x, y, size: 8, font, color: rgb(0.25, 0.25, 0.25) });
    }
  }

  return pdfDoc.save();
}
