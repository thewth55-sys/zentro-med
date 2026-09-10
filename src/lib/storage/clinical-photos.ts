import { createClient } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { buildMediaPath } from "@/lib/storage/upload-media";

export const CLINICAL_PHOTOS_BUCKET = "clinical-photos";
const BUCKET = CLINICAL_PHOTOS_BUCKET;

/** Matches the bucket's file_size_limit (migration 070). */
export const CLINICAL_PHOTO_MAX_BYTES = 15 * 1024 * 1024;

/** Which backend a given `storage_path` was written to — new uploads
 *  are always `'minio'`; a row with no value (or `'supabase'`,
 *  written before this cutover) still lives in Supabase Storage. See
 *  `visit_photos.storage_provider` and siblings. This file is
 *  imported by BOTH client components and server routes, so it never
 *  statically imports `object-storage.ts` (Node-only, pulls in the
 *  AWS SDK) — the browser-reachable MinIO read path below goes
 *  through `/api/storage/signed-url` instead, same reason the upload
 *  path goes through `/api/storage/presign-upload`. */
export type StorageProvider = "supabase" | "minio";

/**
 * Uploads a clinical photo for a patient. This bucket is PRIVATE —
 * patient medical imagery, not a WhatsApp attachment. Callers get
 * back the storage path only; use getClinicalPhotoUrl() for a
 * short-lived signed URL to display it. Always writes to MinIO now —
 * callers persist `storage_provider: 'minio'` alongside this path.
 *
 * Path: clinical-photos/account-<account_id>/patient-<patient_profile_id>/<timestamp>-<basename>.<ext>
 * — the extra patient segment on top of the account-scoped convention
 * (020/023) is cosmetic but keeps a patient's photos visually grouped.
 */
export async function uploadClinicalPhoto(
  accountId: string,
  patientProfileId: string,
  file: File,
): Promise<{ path: string }> {
  const accountScopedPath = buildMediaPath(accountId, file.name);
  const path = accountScopedPath.replace(
    `account-${accountId}/`,
    `account-${accountId}/patient-${patientProfileId}/`,
  );
  await uploadViaPresign(BUCKET, path, file);
  return { path };
}

/** Shared browser-upload helper for this bucket's two client-side
 *  writers (clinical photos, consent templates) — goes through the
 *  presigned-PUT flow rather than a direct SDK call, since the
 *  browser never holds MinIO's secret key. `path` already has its
 *  final account-scoped + sub-folder shape; the route re-derives the
 *  same shape server-side from `subPath` for its own validation. */
async function uploadViaPresign(bucket: string, path: string, file: File): Promise<void> {
  const accountSegment = path.split("/")[0];
  const subPath = path.slice(accountSegment.length + 1, path.lastIndexOf("/"));
  const presignRes = await fetch("/api/storage/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, fileName: path.split("/").pop(), subPath: subPath || undefined, contentType: file.type }),
  });
  if (!presignRes.ok) throw new Error("Could not prepare upload.");
  const { uploadUrl } = (await presignRes.json()) as { uploadUrl: string };
  const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!putRes.ok) throw new Error("Upload failed.");
}

/** Short-lived signed URL — the only way to read from this private
 *  bucket. `provider` says which backend actually holds the object;
 *  defaults to `'supabase'` so existing call sites that haven't been
 *  updated to pass it yet keep resolving pre-cutover rows correctly. */
export async function getClinicalPhotoUrl(
  path: string,
  provider: StorageProvider = "supabase",
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (provider === "minio") {
    const res = await fetch(
      `/api/storage/signed-url?bucket=${BUCKET}&path=${encodeURIComponent(path)}&expiresIn=${expiresInSeconds}`,
    );
    if (!res.ok) return null;
    const { url } = (await res.json()) as { url: string };
    return url;
  }
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error("createSignedUrl error:", error);
    return null;
  }
  return data.signedUrl;
}

export async function deleteClinicalPhoto(path: string, provider: StorageProvider = "supabase"): Promise<void> {
  if (provider === "minio") {
    const res = await fetch("/api/storage/presign-upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket: BUCKET, path }),
    });
    if (!res.ok) throw new Error("Delete failed.");
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

/**
 * Uploads a patient's signature PNG (informed consent or clinical
 * note, migrations 072/073) — same bucket as clinical photos, under a
 * signatures/ subfolder. This already runs server-side (signing an
 * anonymous patient's request), so it writes directly via the
 * service-role S3 credentials — dynamic import keeps `object-storage`
 * (and its AWS SDK dependency) out of this file's static import graph,
 * since browser components import other functions from this same file.
 */
export async function uploadSignatureImage(
  accountId: string,
  targetId: string,
  pngBuffer: Buffer,
): Promise<{ path: string }> {
  const path = `account-${accountId}/signatures/${targetId}.png`;
  const { uploadObject } = await import("@/lib/storage/object-storage");
  await uploadObject(BUCKET, path, pngBuffer, "image/png");
  return { path };
}

/** Uploads a reusable PDF consent template (migration 074), from the
 *  browser client — staff are authenticated, goes through the same
 *  presigned-upload flow as uploadClinicalPhoto. */
export async function uploadConsentTemplatePdf(
  accountId: string,
  file: File,
): Promise<{ path: string }> {
  const accountScopedPath = buildMediaPath(accountId, file.name);
  const path = accountScopedPath.replace(`account-${accountId}/`, `account-${accountId}/consent-templates/`);
  await uploadViaPresign(BUCKET, path, file);
  return { path };
}

/** Server-side signed URL for a caller with no Supabase session (the
 *  public /firmar/[token] flow) — see `provider` note above. Server-
 *  only, so it can import `object-storage` directly. */
export async function getClinicalPhotoUrlAdmin(
  path: string,
  provider: StorageProvider = "supabase",
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (provider === "minio") {
    const { getObjectUrl } = await import("@/lib/storage/object-storage");
    return getObjectUrl(BUCKET, path, { public: false, expiresInSeconds });
  }
  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error("createSignedUrl (admin) error:", error);
    return null;
  }
  return data.signedUrl;
}

/** Downloads a file's bytes server-side — used to read a consent
 *  template's PDF bytes (to hash it when copying it for a patient, or
 *  to stamp a signature onto it at submit time), never exposed to a
 *  browser directly. */
export async function downloadClinicalPhotoAdmin(path: string, provider: StorageProvider = "supabase"): Promise<Buffer> {
  if (provider === "minio") {
    const { downloadObject } = await import("@/lib/storage/object-storage");
    return downloadObject(BUCKET, path);
  }
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "Failed to download file");
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Copies a file within the bucket server-side — used to snapshot a
 *  consent_templates PDF into a per-document path so a later template
 *  edit/deletion can't affect an already-sent document. The copy's
 *  destination is written under the SAME backend as the source —
 *  `provider` describes the source, and the caller must persist that
 *  same value for the destination row. */
export async function copyClinicalPhotoAdmin(
  fromPath: string,
  toPath: string,
  provider: StorageProvider = "supabase",
): Promise<void> {
  if (provider === "minio") {
    const { copyObject } = await import("@/lib/storage/object-storage");
    return copyObject(BUCKET, fromPath, toPath);
  }
  const { error } = await supabaseAdmin().storage.from(BUCKET).copy(fromPath, toPath);
  if (error) throw new Error(error.message);
}
