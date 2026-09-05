import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import type { WaitlistStatus } from "@/types";

const VALID_STATUSES: WaitlistStatus[] = ["waiting", "notified", "booked", "cancelled"];

/**
 * PATCH /api/waitlist/[id]  — update status (e.g. mark "notified" after
 *                              sending the WhatsApp template, or "booked"
 *                              once the patient actually gets an
 *                              appointment).
 * DELETE /api/waitlist/[id] — remove an entry outright.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, accountId } = await requireRole("agent");
    const body = await request.json().catch(() => ({}));

    const patch: Record<string, unknown> = {};
    if (typeof body.status === "string") {
      if (!VALID_STATUSES.includes(body.status as WaitlistStatus)) {
        return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
      }
      patch.status = body.status;
      if (body.status === "notified") patch.notified_at = new Date().toISOString();
    }
    if (typeof body.notes === "string") {
      patch.notes = body.notes.trim().slice(0, 2000) || null;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("waitlist_entries")
      .update(patch)
      .eq("id", id)
      .eq("account_id", accountId)
      .select("*, contact:contacts(*), doctor:doctors(*), service_type:service_types(*)")
      .single();

    if (error) {
      console.error("[waitlist PATCH] error:", error);
      return NextResponse.json({ error: "Failed to update waitlist entry" }, { status: 500 });
    }
    return NextResponse.json({ entry: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, accountId } = await requireRole("agent");

    const { error } = await supabase.from("waitlist_entries").delete().eq("id", id).eq("account_id", accountId);
    if (error) {
      console.error("[waitlist DELETE] error:", error);
      return NextResponse.json({ error: "Failed to remove waitlist entry" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
