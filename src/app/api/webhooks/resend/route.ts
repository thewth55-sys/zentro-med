// ============================================================
// POST /api/webhooks/resend
//
// Open/delivery tracking for email broadcasts. Correlates events to
// `broadcast_recipients` via `resend_message_id` (set when the
// broadcast was sent — see /api/email/broadcast) and reuses the SAME
// status ladder WhatsApp broadcasts already use (sent → delivered →
// read), so the existing aggregate-count trigger (migration 005) and
// the broadcast detail page's Delivered/Read stats work with zero
// extra code — this table was already generic across channels.
//
// Requires the sending domain to have "Open Tracking" turned on in
// the Resend dashboard (Domains → your domain) — that's a one-time
// account setting, not something this code can toggle per-send (the
// Resend API only exposes it at the domain level). Also requires a
// Webhook configured in the Resend dashboard pointing here, at least
// for the `email.delivered` and `email.opened` events.
// ============================================================

import { NextResponse } from "next/server";

import { verifyResendWebhook } from "@/lib/email/resend-client";
import { supabaseAdmin } from "@/lib/billing-platform/admin-client";

export async function POST(request: Request) {
  const rawBody = await request.text();

  let event;
  try {
    event = verifyResendWebhook(rawBody, request.headers);
  } catch (err) {
    console.error("[resend webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const emailId = "email_id" in event.data ? event.data.email_id : undefined;
    if (!emailId) return NextResponse.json({ received: true });

    const db = supabaseAdmin();

    switch (event.type) {
      case "email.delivered":
        await db
          .from("broadcast_recipients")
          .update({ status: "delivered", delivered_at: new Date().toISOString() })
          .eq("resend_message_id", emailId)
          .eq("status", "sent");
        break;

      case "email.opened":
        await db
          .from("broadcast_recipients")
          .update({ status: "read", read_at: new Date().toISOString() })
          .eq("resend_message_id", emailId)
          .in("status", ["sent", "delivered"])
          .is("read_at", null);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error(`[resend webhook] handler error for ${event.type}:`, err);
    // Same posture as the Stripe webhook: return 200 once the
    // signature is verified so Resend doesn't retry-storm on a
    // transient DB hiccup.
  }

  return NextResponse.json({ received: true });
}
