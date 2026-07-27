// ============================================================
// GET  /api/consent-templates — list the account's reusable PDF
//      consent templates (the "banco de documentos").
// POST /api/consent-templates — register a template. The PDF itself
//      is uploaded directly from the browser to Storage first (see
//      uploadConsentTemplatePdf) — this just records the metadata
//      (name + where on the page to stamp the signature).
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import type { StampField, StampFieldType } from "@/types";

const STAMP_FIELD_TYPES: StampFieldType[] = ["signature", "signer_name", "signed_date"];

function parseStampFields(input: unknown): StampField[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const fields: StampField[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return null;
    const { type, page, x, y } = raw as Record<string, unknown>;
    if (typeof type !== "string" || !STAMP_FIELD_TYPES.includes(type as StampFieldType)) return null;
    if (!Number.isInteger(page) || (page as number) < 1) return null;
    if (typeof x !== "number" || !(x >= 0 && x <= 1)) return null;
    if (typeof y !== "number" || !(y >= 0 && y <= 1)) return null;
    fields.push({ type: type as StampFieldType, page: page as number, x, y });
  }
  // A signature image is the one legally-required element (Ley 527 /
  // Decreto 2364 — see migration 072's module comment); name/date are
  // optional extra context staff can place wherever they like.
  if (!fields.some((f) => f.type === "signature")) return null;
  return fields;
}

export async function GET() {
  try {
    const { supabase, accountId } = await requireRole("viewer");
    const { data, error } = await supabase
      .from("consent_templates")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/consent-templates] error:", error);
      return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
    }

    return NextResponse.json({ templates: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole("agent");
    const body = await request.json().catch(() => ({}));

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const storagePath = typeof body?.storagePath === "string" ? body.storagePath : "";
    const stampFields = parseStampFields(body?.stampFields);

    if (!name || !storagePath) {
      return NextResponse.json({ error: "name and storagePath are required" }, { status: 400 });
    }
    if (!stampFields) {
      return NextResponse.json(
        { error: "stampFields must include at least a signature position" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("consent_templates")
      .insert({
        account_id: accountId,
        name,
        storage_path: storagePath,
        stamp_fields: stampFields,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/consent-templates] error:", error);
      return NextResponse.json({ error: "Failed to create the template" }, { status: 500 });
    }

    return NextResponse.json({ template: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
