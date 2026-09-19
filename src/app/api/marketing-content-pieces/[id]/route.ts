import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";

interface MarketingContentPatchBody {
  status?: "approved" | "rejected";
  feedback?: string;
}

/**
 * PATCH /api/marketing-content-pieces/[id] — clinic review action:
 * approve, reject (with feedback), or leave feedback without
 * changing status ("dar observaciones"). RLS also enforces the
 * 'agent' role, this is defense-in-depth + a clean 404 for
 * cross-account ids.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, accountId, userId } = await requireRole("agent");
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as MarketingContentPatchBody | null;

    if (!body || (body.status === undefined && body.feedback === undefined)) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("marketing_content_pieces")
      .select("id")
      .eq("id", id)
      .eq("account_id", accountId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Marketing content piece not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (body.status !== "approved" && body.status !== "rejected") {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      update.status = body.status;
      update.reviewed_by_user_id = userId;
      update.reviewed_at = new Date().toISOString();
    }

    if (body.feedback !== undefined) {
      update.feedback = body.feedback;
    }

    const { data, error } = await supabase
      .from("marketing_content_pieces")
      .update(update)
      .eq("id", id)
      .eq("account_id", accountId)
      .select()
      .single();

    if (error) {
      console.error("[marketing-content-pieces PATCH] error:", error);
      return NextResponse.json({ error: "Failed to update marketing content piece" }, { status: 500 });
    }

    return NextResponse.json({ piece: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
