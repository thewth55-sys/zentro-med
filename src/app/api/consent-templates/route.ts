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
    const stampPageNumber = Number(body?.stampPageNumber);
    const stampXFraction = Number(body?.stampXFraction);
    const stampYFraction = Number(body?.stampYFraction);

    if (!name || !storagePath) {
      return NextResponse.json({ error: "name and storagePath are required" }, { status: 400 });
    }
    if (
      !Number.isInteger(stampPageNumber) ||
      stampPageNumber < 1 ||
      !(stampXFraction >= 0 && stampXFraction <= 1) ||
      !(stampYFraction >= 0 && stampYFraction <= 1)
    ) {
      return NextResponse.json({ error: "Invalid stamp position" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("consent_templates")
      .insert({
        account_id: accountId,
        name,
        storage_path: storagePath,
        stamp_page_number: stampPageNumber,
        stamp_x_fraction: stampXFraction,
        stamp_y_fraction: stampYFraction,
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
