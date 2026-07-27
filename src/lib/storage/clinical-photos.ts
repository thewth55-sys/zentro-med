import { createClient } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { buildMediaPath } from "@/lib/storage/upload-media";

export const CLINICAL_PHOTOS_BUCKET = "clinical-photos";
const BUCKET = CLINICAL_PHOTOS_BUCKET;

/** Matches the bucket's file_size_limit (migration 070). */
export const CLINICAL_PHOTO_MAX_BYTES = 15 * 1024 * 1024;

/**
 * Uploads a clinical photo for a patient. Unlike uploadAccountMedia
 * (chat-media/flow-media/landing-media, all public buckets returning
 * a public URL), this bucket is PRIVATE — patient medical imagery,
 * not a WhatsApp attachment. Callers get back the storage path only;
 * use getClinicalPhotoUrl() for a short-lived signed URL to display it.
 *
 * Path: clinical-photos/account-<account_id>/patient-<patient_profile_id>/<timestamp>-<basename>.<ext>
 * — the extra patient segment on top of the account-scoped convention
 * (020/023) is cosmetic (RLS only checks the first, account- segment)
 * but keeps a patient's photos visually grouped in the Supabase
 * dashboard's storage browser.
 */
export async function uploadClinicalPhoto(
  accountId: string,
  patientProfileId: string,
  file: File,
): Promise<{ path: string }> {
  const supabase = createClient();
  const accountScopedPath = buildMediaPath(accountId, file.name);
  const path = accountScopedPath.replace(
    `account-${accountId}/`,
    `account-${accountId}/patient-${patientProfileId}/`,
  );

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  return { path };
}

/** Short-lived signed URL — the only way to read from this private bucket. */
export async function getClinicalPhotoUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error("createSignedUrl error:", error);
    return null;
  }
  return data.signedUrl;
}

export async function deleteClinicalPhoto(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

/**
 * Uploads a patient's signature PNG (informed consent or clinical
 * note, migrations 072/073) — same bucket as clinical photos, under a
 * signatures/ subfolder so RLS's account-<id> path check (067) still
 * applies without any new policy. Uses the service-role client, not
 * the browser one: the signer is an anonymous patient following an
 * emailed link with no Supabase session, so the normal "Members can
 * upload" storage policy (which requires auth.uid() to resolve to an
 * account member) would reject them. This is the one write in the
 * signing flow that bypasses RLS outright, mirroring how every other
 * server-side admin write in this codebase uses supabaseAdmin().
 *
 * `targetId` is whichever of consent_document_id/clinical_note_id the
 * signature_requests row actually points at — it only namespaces this
 * file's path, it doesn't determine which table gets the signature
 * row (submit_signature's own branching decides that).
 */
export async function uploadSignatureImage(
  accountId: string,
  targetId: string,
  pngBuffer: Buffer,
): Promise<{ path: string }> {
  const path = `account-${accountId}/signatures/${targetId}.png`;
  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(path, pngBuffer, { cacheControl: "3600", upsert: false, contentType: "image/png" });
  if (error) throw new Error(error.message);
  return { path };
}

/** Uploads a reusable PDF consent template (migration 074), from the
 *  browser client — staff are authenticated, so the normal "Members
 *  can upload" storage policy already covers this, same as
 *  uploadClinicalPhoto. */
export async function uploadConsentTemplatePdf(
  accountId: string,
  file: File,
): Promise<{ path: string }> {
  const supabase = createClient();
  const path = `account-${accountId}/consent-templates/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: "application/pdf",
  });
  if (error) throw new Error(error.message);
  return { path };
}

/** Server-side signed URL for a caller with no Supabase session (the
 *  public /firmar/[token] flow) — bypasses storage RLS via the
 *  service-role client, same reasoning as uploadSignatureImage. */
export async function getClinicalPhotoUrlAdmin(
  path: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error("createSignedUrl (admin) error:", error);
    return null;
  }
  return data.signedUrl;
}

/** Downloads a file's bytes via the service-role client — used
 *  server-side to read a consent template's PDF bytes (to hash it
 *  when copying it for a patient, or to stamp a signature onto it at
 *  submit time), never exposed to a browser directly. */
export async function downloadClinicalPhotoAdmin(path: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "Failed to download file");
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Copies a file within the bucket via the service-role client — used
 *  to snapshot a consent_templates PDF into a per-document path so a
 *  later template edit/deletion can't affect an already-sent document. */
export async function copyClinicalPhotoAdmin(fromPath: string, toPath: string): Promise<void> {
  const { error } = await supabaseAdmin().storage.from(BUCKET).copy(fromPath, toPath);
  if (error) throw new Error(error.message);
}
