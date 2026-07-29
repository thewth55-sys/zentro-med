import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { sendPushToAccount, sendPushToUser } from "@/lib/push/send";

/**
 * Receiver for two Supabase Database Webhooks (configured in the
 * Supabase dashboard, not in code — see task/setup notes):
 *
 *   1. INSERT on `messages`   → push the whole account (shared inbox,
 *      same "anyone can see any conversation" model the browser
 *      popup in notification-alerts.tsx already follows).
 *   2. INSERT on `notifications` → push just that row's `user_id`
 *      (today the only notification type is `conversation_assigned`,
 *      inserted by the `notify_conversation_assigned` trigger,
 *      migration 027).
 *
 * This is the "app fully closed" complement to the existing in-tab
 * browser-notification flow, not a replacement for it — a native FCM
 * push is the only way to reach a phone with the app not open.
 *
 * Both webhooks POST here with the same shared secret header so this
 * endpoint isn't a public trigger for arbitrary pushes.
 */
export async function POST(request: Request) {
  const secret = process.env.SUPABASE_DB_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.type !== "INSERT" || !body.record) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (body.table === "messages" && body.record.sender_type === "customer") {
      await handleNewMessage(body.record);
    } else if (body.table === "notifications") {
      await handleNewNotification(body.record);
    }
  } catch (err) {
    // Never surface a 500 here — Supabase will retry a failing
    // webhook, and a broken push send is not worth retry storms.
    console.error("[supabase-db webhook] handler error:", err);
  }

  return NextResponse.json({ ok: true });
}

async function handleNewMessage(message: { conversation_id: string; content_text: string | null }) {
  const db = supabaseAdmin();
  const { data: conversation } = await db
    .from("conversations")
    .select("account_id, contact_id")
    .eq("id", message.conversation_id)
    .maybeSingle();
  if (!conversation) return;

  const { data: contact } = await db
    .from("contacts")
    .select("name, phone")
    .eq("id", conversation.contact_id)
    .maybeSingle();

  await sendPushToAccount(conversation.account_id, {
    title: contact?.name || contact?.phone || "Nuevo mensaje",
    body: message.content_text || "Mensaje nuevo",
    url: `/inbox?c=${message.conversation_id}`,
  });
}

async function handleNewNotification(notification: {
  user_id: string;
  title: string;
  body: string | null;
  conversation_id: string | null;
}) {
  await sendPushToUser(notification.user_id, {
    title: notification.title,
    body: notification.body || "",
    url: notification.conversation_id ? `/inbox?c=${notification.conversation_id}` : undefined,
  });
}
