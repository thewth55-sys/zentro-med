import { createClient } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { buildMediaPath } from "@/lib/storage/upload-media";

const BUCKET = "clinical-photos";

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
 * Uploads a patient's signature PNG (informed consent, migration 072)
 * — same bucket as clinical photos, under a signatures/ subfolder so
 * RLS's account-<id> path check (067) still applies without any new
 * policy. Uses the service-role client, not the browser one: the
 * signer is an anonymous patient following an emailed link with no
 * Supabase session, so the normal "Members can upload" storage policy
 * (which requires auth.uid() to resolve to an account member) would
 * reject them. This is the one write in the informed-consent flow
 * that bypasses RLS outright, mirroring how every other server-side
 * admin write in this codebase uses supabaseAdmin().
 */
export async function uploadSignatureImage(
  accountId: string,
  consentDocumentId: string,
  pngBuffer: Buffer,
): Promise<{ path: string }> {
  const path = `account-${accountId}/signatures/${consentDocumentId}.png`;
  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(path, pngBuffer, { cacheControl: "3600", upsert: false, contentType: "image/png" });
  if (error) throw new Error(error.message);
  return { path };
}
