import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { createContact, createTicket, listTicketsForContact } from "@/lib/zoho-desk/client";

/**
 * GET /api/help/tickets — the caller's own support tickets (agent+).
 * Never calls Zoho Desk if this user has never submitted a ticket —
 * `zoho_desk_contact_id` is only set the first time POST succeeds.
 */
export async function GET() {
  try {
    const { supabase, userId } = await requireRole("agent");
    const { data: profile } = await supabase
      .from("profiles")
      .select("zoho_desk_contact_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.zoho_desk_contact_id) {
      return NextResponse.json({ tickets: [] });
    }

    const tickets = await listTicketsForContact(profile.zoho_desk_contact_id);
    return NextResponse.json({ tickets });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/help/tickets — files a new support ticket in Zoho Desk on
 * behalf of the caller (agent+). Body: { subject, description }.
 *
 * Creates the caller's Zoho Desk contact on first use and remembers
 * its id on `profiles` — see src/lib/zoho-desk/client.ts's file
 * comment for why this can't just re-look-up-or-create every time.
 */
export async function POST(request: Request) {
  try {
    const { supabase, userId } = await requireRole("agent");
    const limit = checkRateLimit(`help-ticket-create:${userId}`, RATE_LIMITS.helpTicketCreate);
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => null);
    const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 200) : "";
    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 4000) : "";
    if (!subject || !description) {
      return NextResponse.json({ error: "subject and description are required" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, zoho_desk_contact_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let contactId = profile.zoho_desk_contact_id;
    if (!contactId) {
      contactId = await createContact(profile.full_name, profile.email);
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ zoho_desk_contact_id: contactId })
        .eq("user_id", userId);
      if (updateErr) {
        console.error("[help/tickets] failed to persist zoho_desk_contact_id:", updateErr);
      }
    }

    const ticket = await createTicket({ contactId, subject, description });
    return NextResponse.json({ ticket });
  } catch (err) {
    return toErrorResponse(err);
  }
}
