import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

/**
 * GET  /api/waitlist  — list waitlist entries (optionally filtered by
 *                        doctor_id/status), used by the Agenda sidebar
 *                        and the waitlist dialog.
 * POST /api/waitlist  — add a contact to the waitlist.
 */
export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole("viewer");
    const url = new URL(request.url);
    const doctorId = url.searchParams.get("doctor_id");
    const status = url.searchParams.get("status");

    let query = supabase
      .from("waitlist_entries")
      .select("*, contact:contacts(*), doctor:doctors(*), service_type:service_types(*)")
      .eq("account_id", accountId)
      .order("created_at", { ascending: true });

    if (doctorId) query = query.eq("doctor_id", doctorId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      console.error("[waitlist GET] error:", error);
      return NextResponse.json({ error: "Failed to load waitlist" }, { status: 500 });
    }
    return NextResponse.json({ entries: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole("agent");
    const body = await request.json().catch(() => ({}));

    if (!body.contact_id || typeof body.contact_id !== "string") {
      return NextResponse.json({ error: "contact_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("waitlist_entries")
      .insert({
        account_id: accountId,
        contact_id: body.contact_id,
        doctor_id: body.doctor_id || null,
        service_type_id: body.service_type_id || null,
        notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) || null : null,
        created_by: userId,
      })
      .select("*, contact:contacts(*), doctor:doctors(*), service_type:service_types(*)")
      .single();

    if (error) {
      console.error("[waitlist POST] error:", error);
      return NextResponse.json({ error: "Failed to add to waitlist" }, { status: 500 });
    }
    return NextResponse.json({ entry: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
