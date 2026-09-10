import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { getObjectUrl } from "@/lib/storage/object-storage";

/**
 * GET /api/storage/signed-url — mints a short-lived signed GET for a
 * MinIO-stored private object. Exists ONLY because MinIO's presigning
 * needs its secret access key, which (unlike Supabase's anon-key +
 * RLS signed-URL flow) can never reach the browser — every private-
 * bucket read a client component makes for a MinIO-backed row has to
 * go through here instead of calling the SDK directly.
 */
export async function GET(request: Request) {
  try {
    const { accountId } = await requireRole("viewer");
    const url = new URL(request.url);
    const bucket = url.searchParams.get("bucket");
    const path = url.searchParams.get("path");
    const expiresIn = Number(url.searchParams.get("expiresIn") ?? "3600");

    if (!bucket || !path) {
      return NextResponse.json({ error: "bucket and path are required" }, { status: 400 });
    }
    if (!path.startsWith(`account-${accountId}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const signedUrl = await getObjectUrl(bucket, path, { public: false, expiresInSeconds: expiresIn });
    return NextResponse.json({ url: signedUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}
