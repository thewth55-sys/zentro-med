import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { getFirebaseMessaging } from "./firebase-admin";

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

export interface PushPayload {
  title: string;
  body: string;
  /** Opened when the user taps the notification — see push-registration.tsx's `pushNotificationActionPerformed` handler. */
  url?: string;
}

interface TokenRow {
  id: string;
  token: string;
}

/**
 * Shared send + stale-token-cleanup core. Silently does nothing if
 * Firebase isn't configured yet, or there are no rows to send to —
 * this must never be the thing that breaks an inbound WhatsApp
 * message or a conversation assignment, so every failure mode here
 * is caught and logged, not thrown.
 */
async function sendToRows(rows: TokenRow[], payload: PushPayload): Promise<void> {
  const messaging = getFirebaseMessaging();
  if (!messaging || rows.length === 0) return;

  const db = supabaseAdmin();
  try {
    const response = await messaging.sendEachForMulticast({
      tokens: rows.map((r) => r.token),
      notification: { title: payload.title, body: payload.body },
      data: payload.url ? { url: payload.url } : undefined,
      android: { priority: "high" },
    });

    const staleIds = response.responses
      .map((r, i) => ({ r, id: rows[i].id }))
      .filter(({ r }) => !r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code))
      .map(({ id }) => id);

    if (staleIds.length > 0) {
      await db.from("push_tokens").delete().in("id", staleIds);
    }
  } catch (err) {
    console.error("[push send] send failed:", err);
  }
}

/**
 * Push to every device one specific user has registered — the
 * targeted case (e.g. "this conversation was assigned to you").
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const db = supabaseAdmin();
  const { data: rows, error } = await db.from("push_tokens").select("id, token").eq("user_id", userId);
  if (error) {
    console.error("[sendPushToUser] failed to load tokens:", error);
    return;
  }
  await sendToRows(rows ?? [], payload);
}

/**
 * Push to every device registered by ANY member of an account — used
 * for new inbound WhatsApp messages, which (like the shared inbox
 * itself, and notification-alerts.tsx's browser popup) aren't
 * restricted to a single assignee: any team member with account
 * access can see and reply to any conversation.
 */
export async function sendPushToAccount(accountId: string, payload: PushPayload): Promise<void> {
  const db = supabaseAdmin();
  const { data: rows, error } = await db.from("push_tokens").select("id, token").eq("account_id", accountId);
  if (error) {
    console.error("[sendPushToAccount] failed to load tokens:", error);
    return;
  }
  await sendToRows(rows ?? [], payload);
}
