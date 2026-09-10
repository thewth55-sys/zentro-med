import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { buildMediaPath } from "@/lib/storage/upload-media";
import { presignPutUrl, getObjectUrl, deleteObject } from "@/lib/storage/object-storage";

/**
 * POST/DELETE /api/storage/presign-upload — lets the browser write
 * new uploads to MinIO without ever holding its secret key: this
 * route builds an account/user-scoped path server-side (the same
 * scoping Supabase Storage's RLS write policies used to enforce),
 * hands back a short-lived presigned PUT for the browser to upload
 * directly to, and does the equivalent check itself for DELETE since
 * MinIO has no RLS of its own to fall back on.
 *
 * `min("viewer")` is intentionally permissive — the real gate is the
 * path-prefix check below, not the role, since `avatars` is a
 * self-service upload any signed-in member (not just an agent) needs
 * to be able to do for their own profile.
 */

const PUBLIC_ACCOUNT_BUCKETS = new Set(["flow-media", "chat-media", "landing-media"]);
const PRIVATE_ACCOUNT_BUCKETS = new Set(["clinical-photos"]);
const KNOWN_BUCKETS = new Set(["avatars", ...PUBLIC_ACCOUNT_BUCKETS, ...PRIVATE_ACCOUNT_BUCKETS]);

function buildPath(bucket: string, userId: string, accountId: string, fileName: string, subPath?: string): string {
  if (bucket === "avatars") {
    const ext = fileName.split(".").pop()?.toLowerCase() || "png";
    return `${userId}/avatar-${Date.now()}.${ext}`;
  }
  const path = buildMediaPath(accountId, fileName);
  return subPath ? path.replace(`account-${accountId}/`, `account-${accountId}/${subPath}/`) : path;
}

export async function POST(request: Request) {
  try {
    const { userId, accountId } = await requireRole("viewer");
    const { bucket, fileName, subPath, contentType } = (await request.json()) as {
      bucket: string;
      fileName: string;
      subPath?: string;
      contentType?: string;
    };

    if (!KNOWN_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: "Unknown bucket" }, { status: 400 });
    }

    const path = buildPath(bucket, userId, accountId, fileName, subPath);
    const uploadUrl = await presignPutUrl(bucket, path, contentType || "application/octet-stream");
    const publicUrl =
      bucket === "avatars" || PUBLIC_ACCOUNT_BUCKETS.has(bucket)
        ? await getObjectUrl(bucket, path, { public: true })
        : null;

    return NextResponse.json({ uploadUrl, publicUrl, path });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, accountId } = await requireRole("viewer");
    const { bucket, path } = (await request.json()) as { bucket: string; path: string };

    if (!KNOWN_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: "Unknown bucket" }, { status: 400 });
    }
    const allowedPrefix = bucket === "avatars" ? `${userId}/` : `account-${accountId}/`;
    if (!path.startsWith(allowedPrefix)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteObject(bucket, path);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
