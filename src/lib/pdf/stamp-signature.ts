// ============================================================
// Server-side only — embeds a patient's signature image + name +
// date onto an existing PDF template at a fixed, pre-configured
// position (migration 074's consent_templates.stamp_*). Does NOT
// rewrite any other text in the document — see that migration's
// module comment for why (PDFs aren't easily editable like a Word
// doc; only the stamp position is configurable per template).
// ============================================================

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface StampSignatureParams {
  pdfBytes: Uint8Array;
  signaturePngBytes: Uint8Array;
  signerName: string;
  signedAt: Date;
  /** 1-indexed, matches consent_templates.stamp_page_number. */
  pageNumber: number;
  /** Bottom-left-origin fractions (0-1), matching pdf-lib's own coordinate system. */
  xFraction: number;
  yFraction: number;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

export async function stampSignatureOntoPdf(params: StampSignatureParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(params.pdfBytes);
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error("The PDF template has no pages");
  }
  const pageIndex = Math.min(Math.max(params.pageNumber - 1, 0), pages.length - 1);
  const page = pages[pageIndex];
  const { width, height } = page.getSize();

  const signatureImage = await pdfDoc.embedPng(params.signaturePngBytes);
  // Signature block is sized relative to the page so it looks
  // consistent across differently-sized PDFs (letter, A4, etc.).
  const sigWidth = width * 0.28;
  const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;

  const x = width * params.xFraction;
  const y = height * params.yFraction;

  page.drawImage(signatureImage, { x, y, width: sigWidth, height: sigHeight });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const label = `${params.signerName} — ${DATE_FORMATTER.format(params.signedAt)}`;
  page.drawText(label, {
    x,
    y: Math.max(y - 12, 4),
    size: 8,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });

  return pdfDoc.save();
}
