// ============================================================
// POST /api/consent-documents/[id]/send
//
// Creates a signature_request (token + expiry) for this consent
// document and emails the signing LINK — not an OTP yet — to the
// patient's email on file. The OTP itself is only generated once the
// patient actually opens the link and asks for one (POST
// /api/sign/[token]/send-otp), so a request that's never opened never
// sends a verification code to anyone.
//
// Deliberately always uses the patient's contacts.email, never an
// address the caller supplies — the whole point of the later OTP
// step is proving the signer controls an address the clinic already
// had on file for this patient, not an address typed into a form.
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
    const { id: documentId } = await params;

    const { data: document, error: docErr } = await supabase
      .from("consent_documents")
      .select("id, title, status, patient_profile_id")
      .eq("id", documentId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (docErr || !document) {
      return NextResponse.json({ error: "Consent document not found" }, { status: 404 });
    }
    if (document.status === "signed") {
      return NextResponse.json({ error: "This document has already been signed" }, { status: 409 });
    }

    const { data: patientProfile, error: profileErr } = await supabase
      .from("patient_profiles")
      .select("contact:contacts(name, email)")
      .eq("id", document.patient_profile_id)
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
      consent_document_id: document.id,
      token_hash: hash,
      delivered_to_email: contact.email,
      expires_at: expiresAt.toISOString(),
      created_by: userId,
    });
    if (insertErr) {
      console.error("[POST .../consent-documents/[id]/send] insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create the signature request" }, { status: 500 });
    }

    const url = signatureUrl(token, getBaseUrl(request));
    const brandName = account?.name ?? "Zentro Med";
    const html = renderBrandedEmail({
      heading: "Documento para firmar",
      bodyHtml: `
        <p>Hola ${escapeHtml(contact.name ?? "")},</p>
        <p>${escapeHtml(brandName)} te envió el documento <strong>${escapeHtml(document.title)}</strong> para tu firma.</p>
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

    await sendEmail({ to: contact.email, subject: `Documento para firmar — ${document.title}`, html });

    return NextResponse.json({ ok: true, sentTo: contact.email, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    return toErrorResponse(err);
  }
}
