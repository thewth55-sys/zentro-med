/**
 * Shared media-upload helper for the account-scoped path convention
 * introduced in migration 020 (`flow-media`) and reused by migration
 * 023 (`chat-media`):
 *
 *   <bucket>/account-<account_id>/<timestamp>-<basename>.<ext>
 *
 * New uploads go to MinIO via the presigned-URL flow
 * (`/api/storage/presign-upload`) rather than Supabase Storage
 * directly — the path convention and this function's public shape
 * (`{publicUrl, path}`) are unchanged, so every existing call site
 * (Flows builder, inbox composer, landing builder, account logo,
 * booking page editor) needed no changes at all.
 */

/** 16 MB — matches the `file_size_limit` on both buckets (migrations 016/020/023). */
export const MEDIA_MAX_BYTES = 16 * 1024 * 1024;

/**
 * Per-kind upload ceilings that mirror Meta's WhatsApp Cloud API caps so
 * a file that the bucket would accept (≤16 MB) but Meta would reject is
 * caught client-side BEFORE upload — otherwise it lands in storage as an
 * orphan and the send fails with a confusing 400. Images are Meta's
 * tightest cap at 5 MB; documents are held at the 16 MB bucket limit
 * (Meta allows 100 MB, but the bucket — and shared-hosting upload UX —
 * caps lower).
 */
export const MEDIA_MAX_BYTES_BY_KIND = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 16 * 1024 * 1024,
} as const;

/**
 * Build the account-scoped object path for an upload. Pure + exported so
 * it can be unit-tested without a Supabase client.
 *
 * - `basename` is stripped of its extension, lower-cased non-safe chars
 *   are collapsed to `_`, and it's capped at 40 chars (falls back to
 *   "file" when empty).
 * - The timestamp + the original name keep collisions between two
 *   concurrent uploads astronomically unlikely.
 */
export function buildMediaPath(
  accountId: string,
  fileName: string,
  now: number = Date.now(),
): string {
  // Only treat the trailing segment as an extension when there's a real
  // one — a bare name like "README" has no extension and falls back to
  // "bin" rather than becoming "readme".
  const hasExt = /\.[^.]+$/.test(fileName);
  const ext = hasExt ? fileName.split(".").pop()!.toLowerCase() : "bin";
  const safeBase =
    fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .slice(0, 40) || "file";
  return `account-${accountId}/${now}-${safeBase}.${ext}`;
}

export interface UploadAccountMediaResult {
  /** Public URL Meta can fetch at send time. */
  publicUrl: string;
  /** Storage object path (account-scoped). */
  path: string;
}

/**
 * Upload a file to an account-scoped bucket and return its public
 * URL. Throws with a user-facing message on presign / upload failure
 * — callers surface it via a toast.
 *
 * Size validation is the caller's responsibility (limits can differ per
 * feature); `MEDIA_MAX_BYTES` is exported for the common case.
 */
export async function uploadAccountMedia(
  bucket: string,
  file: File,
): Promise<UploadAccountMediaResult> {
  const presignRes = await fetch("/api/storage/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, fileName: file.name, contentType: file.type }),
  });
  if (!presignRes.ok) {
    const body = await presignRes.json().catch(() => ({}));
    throw new Error(body.error ?? "Could not prepare upload.");
  }
  const { uploadUrl, publicUrl, path } = (await presignRes.json()) as {
    uploadUrl: string;
    publicUrl: string;
    path: string;
  };

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload failed.");

  return { publicUrl, path };
}

/**
 * Delete a previously-uploaded object. Used to GC media that was staged
 * (uploaded) but never sent — a cancelled draft or a failed Meta send —
 * so abandoned attachments don't accumulate in the public bucket. The
 * DELETE route re-validates the path's account-scoped prefix against
 * the caller's own account (MinIO has no RLS of its own to fall back
 * on), so a caller can only remove objects under their own folder.
 *
 * Best-effort: callers fire-and-forget and swallow errors (a missed
 * delete is a storage nit, not something to surface to the user).
 */
export async function deleteAccountMedia(
  bucket: string,
  path: string,
): Promise<void> {
  const res = await fetch("/api/storage/presign-upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, path }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Delete failed.");
  }
}
