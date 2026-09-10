// ============================================================
// MinIO (S3-compatible) storage — where NEW uploads go, replacing
// Supabase Storage for that purpose. Existing Supabase-stored objects
// are untouched and keep working: this module only ever WRITES to
// MinIO, it never reads from or migrates data out of Supabase.
//
// Mirrors Supabase Storage's own public-bucket/signed-URL split so
// call sites read the same way they did before:
//   - `public: true`  → a permanent URL under MINIO_PUBLIC_URL, no
//     SDK round-trip (the bucket carries a standing anonymous-read
//     policy applied once at bucket-creation time, not per object).
//   - `public: false` → a presigned GET, same shape as Supabase's
//     `createSignedUrl`.
//
// Bucket names are the SAME as their Supabase counterparts (avatars,
// flow-media, chat-media, landing-media, clinical-photos,
// qr-inbound-media) — no new bucket↔prefix mapping to keep in sync.
// ============================================================

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;
let publicClient: S3Client | null = null;

/** For direct server-to-server calls (upload/download/copy/delete) —
 *  these run inside Easypanel's network, so the internal endpoint
 *  (faster, not exposed to the internet) is the right one. */
function getS3Client(): S3Client {
  if (client) return client;
  client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: process.env.MINIO_REGION || "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
    // The SDK defaults to always computing a request checksum, which
    // sends the body as aws-chunked with trailing checksums — MinIO
    // rejects that with "InvalidRequest" (400). Restoring the
    // pre-default behavior (only checksum when the API requires it)
    // is the documented fix for AWS SDK v3 against MinIO.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

/** For any presigned URL that's handed to someone OUTSIDE Easypanel's
 *  network — a browser doing a direct PUT upload, a patient's browser
 *  or Meta's WhatsApp media fetch reading a signed GET. SigV4 signs
 *  the Host header itself, so a URL signed against the internal
 *  endpoint can't just be re-hosted afterward — it has to be signed
 *  against the public endpoint from the start (this was the bug
 *  behind "Failed to fetch (services_minio:9000)" from the browser). */
function getPublicS3Client(): S3Client {
  if (publicClient) return publicClient;
  publicClient = new S3Client({
    endpoint: process.env.MINIO_PUBLIC_URL,
    region: process.env.MINIO_REGION || "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
    // The SDK defaults to always computing a request checksum, which
    // sends the body as aws-chunked with trailing checksums — MinIO
    // rejects that with "InvalidRequest" (400). Restoring the
    // pre-default behavior (only checksum when the API requires it)
    // is the documented fix for AWS SDK v3 against MinIO.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return publicClient;
}

export async function uploadObject(
  bucket: string,
  path: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<{ path: string }> {
  await getS3Client().send(
    new PutObjectCommand({ Bucket: bucket, Key: path, Body: body, ContentType: contentType }),
  );
  return { path };
}

export async function deleteObject(bucket: string, path: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: path }));
}

export async function copyObject(bucket: string, fromPath: string, toPath: string): Promise<void> {
  await getS3Client().send(
    new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${fromPath}`, Key: toPath }),
  );
}

export async function downloadObject(bucket: string, path: string): Promise<Buffer> {
  const result = await getS3Client().send(new GetObjectCommand({ Bucket: bucket, Key: path }));
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Empty object body for ${bucket}/${path}`);
  return Buffer.from(bytes);
}

export async function getObjectUrl(
  bucket: string,
  path: string,
  opts: { public: boolean; expiresInSeconds?: number },
): Promise<string> {
  if (opts.public) {
    return `${process.env.MINIO_PUBLIC_URL}/${bucket}/${path}`;
  }
  return getSignedUrl(getPublicS3Client(), new GetObjectCommand({ Bucket: bucket, Key: path }), {
    expiresIn: opts.expiresInSeconds ?? 3600,
  });
}

/** For the browser-upload flow: a short-lived presigned PUT the
 *  client can upload directly to, without ever holding MinIO's
 *  secret key (mirrors why Supabase never gave the browser
 *  service-role credentials either). */
export async function presignPutUrl(
  bucket: string,
  path: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<string> {
  return getSignedUrl(
    getPublicS3Client(),
    new PutObjectCommand({ Bucket: bucket, Key: path, ContentType: contentType }),
    { expiresIn: expiresInSeconds },
  );
}
