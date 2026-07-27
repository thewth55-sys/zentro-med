// ============================================================
// POST /api/clinical-notes/[id]/send-for-signature
//
// Mirrors /api/consent-documents/[id]/send exactly, except the
// signature_request points at clinical_note_id instead of
// consent_document_id (migration 073 generalized signature_requests
// to take either). The doctor's own signature on the note already
// exists (signed_at, set at creation, immutable) — this is only
// about additionally getting the PATIENT's signature on it.
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { generateSignatureToken, signatureRequestExpiry, signatureUrl } from "@/lib/signatures/tokens";
import { sendEmail } from "@/lib/email/resend-client";
import { renderBrandedEmail, escapeHtml } from "@/lib/email/branded-template";

function getBaseUrl(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) return `${forwardedProto || "https"}://${forwardedHost}`;
  const host = request.headers.get("host")?.trim();
  if (host) return `${new URL(request.url).protocol}//${host}`;
  return "https://med.zentrolabs.com";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, accountId, userId } = await requireRole("agent");
    const { id: noteId } = await params;

    const { data: note, error: noteErr } = await supabase
      .from("clinical_notes")
      .select("id, patient_profile_id, signed_at")
      .eq("id", noteId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (noteErr || !note) {
      return NextResponse.json({ error: "Clinical note not found" }, { status: 404 });
    }

    const { data: existingSignature } = await supabase
      .from("clinical_note_signatures")
      .select("id")
      .eq("clinical_note_id", noteId)
      .maybeSingle();
    if (existingSignature) {
      return NextResponse.json({ error: "This note has already been signed by the patient" }, { status: 409 });
    }

    const { data: patientProfile, error: profileErr } = await supabase
      .from("patient_profiles")
      .select("contact:contacts(name, email)")
      .eq("id", note.patient_profile_id)
      .maybeSingle();
    const contact = Array.isArray(patientProfile?.contact)
      ? patientProfile?.contact[0]
      : patientProfile?.contact;
    if (profileErr || !contact?.email) {
      return NextResponse.json(
        { error: "This patient has no email on file — add one in the Detalles tab first" },
        { status: 400 },
      );
    }

    const { data: account } = await supabase
      .from("accounts")
      .select("name, logo_url, quote_accent_color")
      .eq("id", accountId)
      .maybeSingle();

    const { token, hash } = generateSignatureToken();
    const expiresAt = signatureRequestExpiry();

    const { error: insertErr } = await supabase.from("signature_requests").insert({
      account_id: accountId,
      clinical_note_id: note.id,
      token_hash: hash,
      delivered_to_email: contact.email,
      expires_at: expiresAt.toISOString(),
      created_by: userId,
    });
    if (insertErr) {
      console.error("[POST .../clinical-notes/[id]/send-for-signature] insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create the signature request" }, { status: 500 });
    }

    const url = signatureUrl(token, getBaseUrl(request));
    const brandName = account?.name ?? "Zentro Med";
    const html = renderBrandedEmail({
      heading: "Nota de evolución para firmar",
      bodyHtml: `
        <p>Hola ${escapeHtml(contact.name ?? "")},</p>
        <p>${escapeHtml(brandName)} te envió tu nota de evolución de la consulta para tu firma de conformidad.</p>
        <p style="margin:24px 0;">
          <a href="${url}" style="background:#4ade5a;color:#0f2010;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Revisar y firmar →</a>
        </p>
        <p style="font-size:13px;color:#666;">Este enlace es personal e intransferible — te pediremos un código de verificación enviado a este mismo correo antes de firmar.</p>
      `,
      brandName,
      logoUrl: account?.logo_url,
      accentColor: account?.quote_accent_color,
      footerNote: `Enviado por ${brandName} a través de Zentro Med.`,
    });

    try {
      await sendEmail({ to: contact.email, subject: "Nota de evolución para firmar", html });
    } catch (emailErr) {
      console.error("[POST .../clinical-notes/[id]/send-for-signature] email send error:", emailErr);
      return NextResponse.json(
        {
          error:
            emailErr instanceof Error
              ? `No se pudo enviar el correo: ${emailErr.message}`
              : "No se pudo enviar el correo",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, sentTo: contact.email, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    return toErrorResponse(err);
  }
}
