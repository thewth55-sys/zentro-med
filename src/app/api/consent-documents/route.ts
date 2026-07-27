// ============================================================
// GET  /api/consent-documents?patient_profile_id=<id> — list a
//      patient's informed-consent documents, newest first.
// POST /api/consent-documents — create a new one, either:
//      { title, content }              — typed text (frozen; see
//        migration 072's module comment for why `content` is never
//        edited after creation), or
//      { templateId, patientProfileId } — from a reusable PDF
//        template (migration 074): the template's PDF is copied into
//        a per-document path (so a later template edit/delete can't
//        affect an already-sent document) and hashed for tamper
//        evidence, since pdf_hash can't be a GENERATED column the
//        way content_hash is (the bytes live in Storage, not a
//        Postgres column).
// ============================================================

import { randomUUID, createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { CLINICAL_PHOTOS_BUCKET } from "@/lib/storage/clinical-photos";
import type { StampField } from "@/types";

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
    if (!patientProfileId) {
      return NextResponse.json({ error: "patientProfileId is required" }, { status: 400 });
    }

    const templateId = typeof body?.templateId === "string" ? body.templateId : "";

    if (templateId) {
      const { data: template, error: templateErr } = await supabase
        .from("consent_templates")
        .select("*")
        .eq("id", templateId)
        .eq("account_id", accountId)
        .maybeSingle();
      if (templateErr || !template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      const templateFields = (template.stamp_fields ?? []) as StampField[];
      const customFieldValues = (body?.customFieldValues ?? {}) as Record<string, unknown>;
      const customFields = templateFields.filter((f) => f.type === "custom_text");
      for (const field of customFields) {
        const value = customFieldValues[field.id];
        if (typeof value !== "string" || !value.trim()) {
          return NextResponse.json(
            { error: `Falta un valor para el campo "${field.label}"` },
            { status: 400 },
          );
        }
      }
      const documentFields: StampField[] = templateFields.map((f) =>
        f.type === "custom_text" ? { ...f, value: (customFieldValues[f.id] as string).trim() } : f,
      );

      const documentId = randomUUID();
      const destPath = `account-${accountId}/consent-documents/${documentId}.pdf`;

      const { error: copyErr } = await supabase.storage
        .from(CLINICAL_PHOTOS_BUCKET)
        .copy(template.storage_path, destPath);
      if (copyErr) {
        console.error("[POST /api/consent-documents] template copy error:", copyErr);
        return NextResponse.json({ error: "Failed to copy the template file" }, { status: 500 });
      }

      const { data: pdfBlob, error: downloadErr } = await supabase.storage
        .from(CLINICAL_PHOTOS_BUCKET)
        .download(destPath);
      if (downloadErr || !pdfBlob) {
        console.error("[POST /api/consent-documents] template download error:", downloadErr);
        return NextResponse.json({ error: "Failed to read the copied template" }, { status: 500 });
      }
      const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
      const pdfHash = createHash("sha256").update(pdfBuffer).digest("hex");

      const { data, error } = await supabase
        .from("consent_documents")
        .insert({
          id: documentId,
          account_id: accountId,
          patient_profile_id: patientProfileId,
          title: template.name,
          source_type: "pdf",
          template_id: template.id,
          pdf_storage_path: destPath,
          pdf_hash: pdfHash,
          stamp_fields: documentFields,
          created_by: userId,
        })
        .select("*")
        .single();

      if (error) {
        console.error("[POST /api/consent-documents] insert (pdf) error:", error);
        return NextResponse.json({ error: "Failed to create the consent document" }, { status: 500 });
      }

      return NextResponse.json({ document: data });
    }

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required (or pass templateId instead)" },
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
