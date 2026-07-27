// ============================================================
// GET  /api/consent-documents?patient_profile_id=<id> — list a
//      patient's informed-consent documents, newest first.
// POST /api/consent-documents — create a new one (frozen text; see
//      migration 072's module comment for why `content` is never
//      edited after creation).
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole("viewer");
    const url = new URL(request.url);
    const patientProfileId = url.searchParams.get("patient_profile_id");
    if (!patientProfileId) {
      return NextResponse.json({ error: "patient_profile_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("consent_documents")
      .select("*, signature:consent_signatures(*)")
      .eq("account_id", accountId)
      .eq("patient_profile_id", patientProfileId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/consent-documents] error:", error);
      return NextResponse.json({ error: "Failed to load consent documents" }, { status: 500 });
    }

    return NextResponse.json({ documents: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole("agent");
    const body = await request.json().catch(() => ({}));

    const patientProfileId = typeof body?.patientProfileId === "string" ? body.patientProfileId : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!patientProfileId || !title || !content) {
      return NextResponse.json(
        { error: "patientProfileId, title, and content are all required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("consent_documents")
      .insert({
        account_id: accountId,
        patient_profile_id: patientProfileId,
        title,
        content,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/consent-documents] error:", error);
      return NextResponse.json({ error: "Failed to create the consent document" }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
