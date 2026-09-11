// ============================================================
// POST /api/clinical/prescriptions/signature
//
// Uploads ONE freshly-drawn signature PNG, keyed by a client-generated
// verification token (crypto.randomUUID()) — not by user or account,
// so it can't be silently reused across documents (see
// 134_prescription_signature.sql for why a reusable signature was
// rejected). The caller uploads here FIRST, then includes the
// returned path + the same token in the single INSERT that creates
// the prescription row (prescriptions are immutable from creation,
// so there's no later step to attach it).
//
// Same base64 PNG regex + empty-signature size guard as the public
// /api/sign/[token]/submit flow this mirrors.
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { uploadSignatureImage } from "@/lib/storage/clinical-photos";

const TOKEN_RE = /^[a-zA-Z0-9-]{8,80}$/;

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("agent");

    const body = (await request.json().catch(() => null)) as
      | { signatureDataUrl?: unknown; token?: unknown }
      | null;

    const token = typeof body?.token === "string" ? body.token : "";
    if (!TOKEN_RE.test(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const signatureDataUrl = typeof body?.signatureDataUrl === "string" ? body.signatureDataUrl : "";
    const match = /^data:image\/png;base64,(.+)$/.exec(signatureDataUrl);
    if (!match) {
      return NextResponse.json({ error: "Invalid signature image" }, { status: 400 });
    }

    const pngBuffer = Buffer.from(match[1], "base64");
    // A blank canvas export is only a few hundred bytes — reject
    // before it becomes a "signed" document with no actual signature.
    if (pngBuffer.byteLength < 500) {
      return NextResponse.json({ error: "Draw your signature before saving" }, { status: 400 });
    }

    const { path } = await uploadSignatureImage(ctx.accountId, token, pngBuffer);

    return NextResponse.json({ ok: true, path });
  } catch (err) {
    return toErrorResponse(err);
  }
}
