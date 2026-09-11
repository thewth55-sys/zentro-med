import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { uploadObject, getObjectUrl } from "@/lib/storage/object-storage";
import { getClinicalPhotoUrlAdmin } from "@/lib/storage/clinical-photos";
import { PrescriptionPdfDocument } from "@/lib/billing/prescription-pdf-document";
import { checkAllergyConflict } from "@/lib/clinical/prescription-types";
import type { AccountCountry } from "@/lib/country";

const BUCKET = "chat-media";

/**
 * POST /api/clinical/prescriptions/[prescriptionId]/pdf — same
 * branded-PDF-to-signed-URL pattern as
 * /api/billing/invoices/[id]/pdf (see that route's header comment
 * for why this returns `{ url, filename }` JSON rather than a raw
 * PDF stream — private, time-limited link, not a public one).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ prescriptionId: string }> },
) {
  try {
    const { supabase, accountId, account } = await requireRole("agent");
    const { prescriptionId } = await params;

    // Plain point lookups by id rather than embedded FK joins for
    // `prescriptions`/`prescription_items` — brand-new tables/FKs
    // (migration 132) can hit PostgREST's schema-cache staleness
    // (PGRST200) right after a migration, the same failure mode
    // documented for `getCurrentAccount`/`AuthProvider.fetchProfile`.
    // `doctors`/`patient_profiles`/`contacts` are long-established
    // tables, safe to embed elsewhere, but kept flat here too for
    // consistency in one query chain.
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

    let doctorLicense: string | null = null;
    let doctorLicenseInstitution: string | null = null;
    if (doctor?.user_id) {
      const { data: doctorProfile } = await supabase
        .from("profiles")
        .select("license_number, license_institution")
        .eq("user_id", doctor.user_id)
        .maybeSingle();
      doctorLicense = doctorProfile?.license_number ?? null;
      doctorLicenseInstitution = doctorProfile?.license_institution ?? null;
    }

    // The signature is captured fresh per prescription (see
    // 134_prescription_signature.sql) — resolved from the
    // prescription's own row, never from a reusable per-doctor image.
    const signatureImageUrl = prescription.signature_storage_path
      ? await getClinicalPhotoUrlAdmin(prescription.signature_storage_path, "minio")
      : null;

    const contact = patientProfile
      ? (await supabase.from("contacts").select("*").eq("id", patientProfile.contact_id).maybeSingle()).data
      : null;
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
        verificationToken={prescription.verification_token ?? null}
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

    const path = `account-${accountId}/prescription-${prescription.folio}-${Date.now()}.pdf`;
    try {
      await uploadObject(BUCKET, path, buffer, "application/pdf");
    } catch (uploadErr) {
      console.error("[POST /api/clinical/prescriptions/[prescriptionId]/pdf] upload error:", uploadErr);
      return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }

    // Private, time-limited — same reasoning as the invoice PDF route:
    // this document carries the patient's name and health data, so a
    // permanent public URL is never appropriate even though it may be
    // shared with the patient directly.
    const url = await getObjectUrl(BUCKET, path, { public: false, expiresInSeconds: 60 * 60 * 48 });

    return NextResponse.json({
      url,
      filename: `Receta-${prescription.folio}.pdf`,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
