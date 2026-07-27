// ============================================================
// POST /api/sign/[token]/submit
//
// Public. The actual signing write. Uploads the signature PNG first
// (service-role client — see uploadSignatureImage's comment for why),
// then calls submit_signature(), which re-validates the OTP itself
// (valid for 15 minutes after verify-otp) rather than trusting that
// the earlier verify-otp call was enough on its own.
// ============================================================

import { NextResponse } from "next/server";

import { hashSignatureToken } from "@/lib/signatures/tokens";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import {
  CLINICAL_PHOTOS_BUCKET,
  downloadClinicalPhotoAdmin,
  uploadSignatureImage,
} from "@/lib/storage/clinical-photos";
import { stampSignatureOntoPdf } from "@/lib/pdf/stamp-signature";
import { sendEmail } from "@/lib/email/resend-client";
import { renderBrandedEmail, escapeHtml } from "@/lib/email/branded-template";
import type { StampField } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`sign-submit:${ip}`, RATE_LIMITS.signatureSubmit);
  if (!limit.success) return rateLimitResponse(limit);

  const { token } = await params;
  if (!token) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const signerName = typeof body?.signerName === "string" ? body.signerName.trim() : "";
  const signatureDataUrl = typeof body?.signatureDataUrl === "string" ? body.signatureDataUrl : "";

  if (!signerName) {
    return NextResponse.json({ ok: false, reason: "signer_name_required" });
  }
  const match = /^data:image\/png;base64,(.+)$/.exec(signatureDataUrl);
  if (!match) {
    return NextResponse.json({ ok: false, reason: "invalid_signature_image" });
  }

  const tokenHash = hashSignatureToken(token);

  // Resolve account_id/consent_document_id for the storage path via
  // the service-role client — an anonymous signer has no session for
  // RLS to scope this read, same reasoning as every RPC here being
  // SECURITY DEFINER.
  const admin = supabaseAdmin();
  const { data: req, error: reqErr } = await admin
    .from("signature_requests")
    .select("account_id, consent_document_id, clinical_note_id, delivered_to_email, expires_at, redeemed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (reqErr || !req) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  if (req.redeemed_at) return NextResponse.json({ ok: false, reason: "already_signed" });
  if (new Date(req.expires_at) <= new Date()) {
    return NextResponse.json({ ok: false, reason: "expired" });
  }

  const pngBuffer = Buffer.from(match[1], "base64");
  // A blank canvas export is only a few hundred bytes — reject before
  // it becomes a permanent "signed" record with no actual signature.
  if (pngBuffer.byteLength < 500) {
    return NextResponse.json({ ok: false, reason: "empty_signature" });
  }

  // Either id uniquely identifies the target — used only to namespace
  // the signature image's own path, not which table gets the row
  // (submit_signature decides that from signature_requests itself).
  const targetId = req.consent_document_id ?? req.clinical_note_id;

  let storagePath: string;
  try {
    const { path } = await uploadSignatureImage(req.account_id, targetId, pngBuffer);
    storagePath = path;
  } catch (err) {
    console.error("[sign/submit] upload error:", err);
    return NextResponse.json({ ok: false, reason: "upload_failed" }, { status: 500 });
  }

  // PDF-sourced consent documents get the signature stamped directly
  // onto a copy of the actual PDF — the resulting file is the artifact
  // of record, in addition to the signature image row. Also fetches
  // title/content so the "here's your copy" email below (sent after
  // submit_signature succeeds) doesn't need a second round-trip.
  let signedPdfStoragePath: string | null = null;
  let stampedPdfBytes: Uint8Array | null = null;
  let consentDoc: { title: string; source_type: string; content: string | null } | null = null;
  if (req.consent_document_id) {
    const { data: doc } = await admin
      .from("consent_documents")
      .select("title, source_type, content, pdf_storage_path, stamp_fields")
      .eq("id", req.consent_document_id)
      .maybeSingle();
    consentDoc = doc ? { title: doc.title, source_type: doc.source_type, content: doc.content } : null;

    if (doc?.source_type === "pdf" && doc.pdf_storage_path) {
      try {
        const originalPdf = await downloadClinicalPhotoAdmin(doc.pdf_storage_path);
        const stampedPdf = await stampSignatureOntoPdf({
          pdfBytes: originalPdf,
          signaturePngBytes: pngBuffer,
          signerName,
          signedAt: new Date(),
          fields: (doc.stamp_fields as StampField[] | null) ?? [],
        });
        stampedPdfBytes = stampedPdf;
        signedPdfStoragePath = `account-${req.account_id}/signatures/${req.consent_document_id}-signed.pdf`;
        const { error: uploadErr } = await admin.storage
          .from(CLINICAL_PHOTOS_BUCKET)
          .upload(signedPdfStoragePath, Buffer.from(stampedPdf), {
            cacheControl: "3600",
            upsert: false,
            contentType: "application/pdf",
          });
        if (uploadErr) throw new Error(uploadErr.message);
      } catch (err) {
        console.error("[sign/submit] pdf stamping error:", err);
        return NextResponse.json({ ok: false, reason: "pdf_stamp_failed" }, { status: 500 });
      }
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_signature", {
    p_token_hash: tokenHash,
    p_signer_name: signerName,
    p_signature_storage_path: storagePath,
    p_ip_address: ip,
    p_user_agent: request.headers.get("user-agent") ?? null,
    p_signed_pdf_storage_path: signedPdfStoragePath,
  });

  if (error) {
    console.error("[sign/submit] rpc error:", error);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }

  // Best-effort — the signer's legal record of what they signed is
  // already durable (Storage + consent_signatures/clinical_note_signatures
  // rows) regardless of whether this email goes through, and the
  // /firmar/[token] link stops showing the document once redeemed_at
  // is set, so this is the only copy the signer keeps otherwise.
  if ((data as { ok?: boolean } | null)?.ok && req.delivered_to_email) {
    try {
      const { data: account } = await admin
        .from("accounts")
        .select("name, logo_url, quote_accent_color")
        .eq("id", req.account_id)
        .maybeSingle();
      const brandName = account?.name ?? "Zentro Med";

      let subject: string;
      let bodyHtml: string;
      let attachments: { filename: string; content: Buffer }[] | undefined;

      if (consentDoc) {
        subject = `Copia de tu documento firmado — ${consentDoc.title}`;
        if (stampedPdfBytes) {
          bodyHtml = `<p>Hola ${escapeHtml(signerName)},</p><p>Adjunto encontrarás una copia del documento que acabas de firmar con ${escapeHtml(brandName)}.</p>`;
          attachments = [{ filename: `${consentDoc.title}.pdf`, content: Buffer.from(stampedPdfBytes) }];
        } else {
          bodyHtml = `
            <p>Hola ${escapeHtml(signerName)},</p>
            <p>Esta es una copia del documento que acabas de firmar con ${escapeHtml(brandName)}.</p>
            <div style="white-space:pre-wrap;border:1px solid #e5e5e5;border-radius:8px;padding:16px;margin-top:16px;">${escapeHtml(consentDoc.content ?? "")}</div>
          `;
        }
      } else {
        const { data: note } = await admin
          .from("clinical_notes")
          .select("chief_complaint, findings_and_plan")
          .eq("id", req.clinical_note_id)
          .maybeSingle();
        subject = `Copia de tu nota de evolución firmada`;
        bodyHtml = `
          <p>Hola ${escapeHtml(signerName)},</p>
          <p>Esta es una copia de la nota de evolución que acabas de firmar con ${escapeHtml(brandName)}.</p>
          <p><strong>Motivo de consulta:</strong><br/>${escapeHtml(note?.chief_complaint ?? "")}</p>
          <p><strong>Hallazgos y plan:</strong><br/>${escapeHtml(note?.findings_and_plan ?? "")}</p>
        `;
      }

      await sendEmail({
        to: req.delivered_to_email,
        subject,
        html: renderBrandedEmail({
          heading: "Documento firmado",
          bodyHtml,
          brandName,
          logoUrl: account?.logo_url,
          accentColor: account?.quote_accent_color,
          footerNote: `Enviado por ${brandName} a través de Zentro Med.`,
        }),
        attachments,
      });
    } catch (err) {
      console.error("[sign/submit] copy email error:", err);
    }
  }

  return NextResponse.json(data);
}
