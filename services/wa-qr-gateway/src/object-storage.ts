import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Minimal duplicate of the monolith's src/lib/storage/object-storage.ts
// upload path — this service has its own package.json/deployment and
// doesn't share code with the monolith (same pattern as mime.ts and
// supabase.ts already being independently implemented here), so it
// only needs the one function it actually calls: uploading inbound
// media it just downloaded from WhatsApp.

let client: S3Client | null = null;

function getS3Client(): S3Client {
  if (client) return client;
  client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: process.env.MINIO_REGION || 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
    // See the monolith's src/lib/storage/object-storage.ts for why —
    // the SDK's default checksum behavior sends aws-chunked bodies
    // that MinIO rejects with "InvalidRequest".
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return client;
}

export async function uploadObject(bucket: string, path: string, body: Buffer, contentType: string): Promise<void> {
  await getS3Client().send(new PutObjectCommand({ Bucket: bucket, Key: path, Body: body, ContentType: contentType }));
}
