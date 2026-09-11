import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { getClinicalPhotoUrlAdmin } from "@/lib/storage/clinical-photos";
import { PrescriptionPdfDocument } from "@/lib/billing/prescription-pdf-document";
import { checkAllergyConflict } from "@/lib/clinical/prescription-types";
import { sendEmail } from "@/lib/email/resend-client";
import { renderBrandedEmail, escapeHtml } from "@/lib/email/branded-template";
import type { AccountCountry } from "@/lib/country";

/**
 * POST /api/clinical/prescriptions/[prescriptionId]/send-email — same
 * PDF render as the .../pdf route (kept separate rather than sharing
 * a helper, same "each route owns its own render" precedent as the
 * billing PDF/send-email routes already follow), attached directly to
 * a Resend email instead of uploaded for a WhatsApp media_url.
 * Requires the patient to have an email on file.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ prescriptionId: string }> },
) {
  try {
    const { supabase, accountId, account } = await requireRole("agent");
    const { prescriptionId } = await params;

    const { data: prescription, error: rxErr } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("id", prescriptionId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (rxErr || !prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    const [{ data: doctor }, { data: patientProfile }, { data: items }] = await Promise.all([
      prescription.doctor_id
        ? supabase.from("doctors").select("*").eq("id", prescription.doctor_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("patient_profiles").select("*").eq("id", prescription.patient_profile_id).maybeSingle(),
      supabase
        .from("prescription_items")
        .select("*")
        .eq("prescription_id", prescriptionId)
        .order("position", { ascending: true }),
    ]);

    const contact = patientProfile
      ? (await supabase.from("contacts").select("*").eq("id", patientProfile.contact_id).maybeSingle()).data
      : null;

    if (!contact?.email) {
      return NextResponse.json({ error: "This patient has no email on file" }, { status: 400 });
    }

    let doctorLicense: string | null = null;
    let doctorLicenseInstitution: string | null = null;
    let signatureImageUrl: string | null = null;
    if (doctor?.user_id) {
      const { data: doctorProfile } = await supabase
        .from("profiles")
        .select("license_number, license_institution, signature_url")
        .eq("user_id", doctor.user_id)
        .maybeSingle();
      doctorLicense = doctorProfile?.license_number ?? null;
      doctorLicenseInstitution = doctorProfile?.license_institution ?? null;
      if (doctorProfile?.signature_url) {
        signatureImageUrl = await getClinicalPhotoUrlAdmin(doctorProfile.signature_url, "minio");
      }
    }

    const patientName = contact?.name || contact?.phone || "—";
    const patientDocument = patientProfile?.document_number
      ? `${patientProfile.document_type ? patientProfile.document_type.toUpperCase() + " " : ""}${patientProfile.document_number}`
      : null;
    const patientAge = patientProfile?.birth_date
      ? `${Math.floor(
          (Date.now() - new Date(patientProfile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        )} años`
      : null;

    const pdfItems = ((items ?? []) as Array<Record<string, unknown>>).map((it) => ({
      genericName: it.generic_name as string,
      concentration: (it.concentration as string) ?? null,
      brandName: (it.brand_name as string) ?? null,
      presentation: (it.presentation as string) ?? null,
      dose: (it.dose as string) ?? null,
      route: (it.route as string) ?? null,
      frequency: (it.frequency as string) ?? null,
      duration: (it.duration as string) ?? null,
      quantityToDispense: (it.quantity_to_dispense as string) ?? null,
    }));

    const allergyHit = pdfItems.some((it) => checkAllergyConflict(it.genericName, patientProfile?.allergies ?? null));

    const buffer = await renderToBuffer(
      <PrescriptionPdfDocument
        accountName={account.name}
        logoUrl={account.logoUrl}
        accentColor={account.quoteAccentColor}
        address={account.address}
        doctorName={doctor?.name ?? "—"}
        doctorLicense={doctorLicense}
        doctorLicenseInstitution={doctorLicenseInstitution}
        signatureImageUrl={signatureImageUrl}
        folio={prescription.folio}
        issuedAt={new Date(prescription.signed_at).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        countryAtIssue={(prescription.country_at_issue as AccountCountry) ?? "mx"}
        patientName={patientName}
        patientDocument={patientDocument}
        patientAge={patientAge}
        allergyBanner={
          allergyHit
            ? `ALERGIA REGISTRADA · revisar contra: ${patientProfile?.allergies}`
            : null
        }
        items={pdfItems}
        indications={prescription.indications ?? null}
      />,
    );

    const html = renderBrandedEmail({
      heading: `Receta ${prescription.folio}`,
      bodyHtml: `<p>Hola ${escapeHtml(patientName)},</p><p>Adjuntamos tu receta emitida por ${escapeHtml(doctor?.name ?? account.name)}.</p>`,
      brandName: account.name,
      logoUrl: account.logoUrl,
      accentColor: account.quoteAccentColor,
      footerNote: `Enviado por ${account.name}.`,
    });

    await sendEmail({
      to: contact.email,
      subject: `Receta ${prescription.folio} — ${account.name}`,
      html,
      fromName: account.name,
      attachments: [{ filename: `Receta-${prescription.folio}.pdf`, content: buffer }],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
