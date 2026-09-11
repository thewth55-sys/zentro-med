// ============================================================
// POST /api/account/profile/signature
//
// Self-service: an authenticated user captures their OWN reusable
// autograph signature (canvas-drawn, same `signature_pad` library
// and PNG-dataURL shape as the public /firmar/[token] flow) plus the
// institution that issued their professional license. Required
// before a prescription can be signed and issued (see
// prescription-tab.tsx) — this is the "set it up now if missing"
// step migration 133 added `profiles.signature_url`/
// `license_institution` for.
//
// Mirrors /api/sign/[token]/submit's image handling exactly (same
// base64 PNG regex + empty-signature size guard + `uploadSignatureImage`
// helper), just authenticated instead of anonymous-by-token.
// ============================================================

import { NextResponse } from "next/server";

import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { uploadSignatureImage } from "@/lib/storage/clinical-photos";

const MAX_INSTITUTION_LEN = 200;

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount();

    const body = (await request.json().catch(() => null)) as
      | { signatureDataUrl?: unknown; licenseInstitution?: unknown }
      | null;

    const signatureDataUrl = typeof body?.signatureDataUrl === "string" ? body.signatureDataUrl : "";
    const match = /^data:image\/png;base64,(.+)$/.exec(signatureDataUrl);
    if (!match) {
      return NextResponse.json({ error: "Invalid signature image" }, { status: 400 });
    }

    const pngBuffer = Buffer.from(match[1], "base64");
    // A blank canvas export is only a few hundred bytes — reject
    // before it becomes a permanent "signature on file" with no
    // actual signature drawn.
    if (pngBuffer.byteLength < 500) {
      return NextResponse.json({ error: "Draw your signature before saving" }, { status: 400 });
    }

    let licenseInstitution: string | null | undefined;
    if (body?.licenseInstitution !== undefined) {
      if (body.licenseInstitution !== null && typeof body.licenseInstitution !== "string") {
        return NextResponse.json({ error: "'licenseInstitution' must be a string or null" }, { status: 400 });
      }
      const trimmed = typeof body.licenseInstitution === "string" ? body.licenseInstitution.trim() : null;
      if (trimmed && trimmed.length > MAX_INSTITUTION_LEN) {
        return NextResponse.json(
          { error: `'licenseInstitution' must be ${MAX_INSTITUTION_LEN} characters or fewer` },
          { status: 400 },
        );
      }
      licenseInstitution = trimmed || null;
    }

    const { path } = await uploadSignatureImage(ctx.accountId, ctx.userId, pngBuffer);

    const update: Record<string, string | null> = { signature_url: path };
    if (licenseInstitution !== undefined) update.license_institution = licenseInstitution;

    const { error } = await ctx.supabase.from("profiles").update(update).eq("user_id", ctx.userId);
    if (error) {
      console.error("[POST /api/account/profile/signature] update error:", error);
      return NextResponse.json({ error: "Failed to save signature" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, path });
  } catch (err) {
    return toErrorResponse(err);
  }
}
