// ============================================================
// Outbound webhook event vocabulary — pure, no I/O.
//
// An endpoint subscribes to one or more of these. Adding an event is
// one entry here plus a `dispatchWebhookEvent` call at the source of
// the event (the DB stores subscriptions as a free `text[]`, so no
// migration is needed — same model as API scopes).
// ============================================================

export const WEBHOOK_EVENTS = [
  'message.received', // an inbound WhatsApp message landed
  'message.status_updated', // a sent message advanced (sent/delivered/read)
  'conversation.created', // a new conversation was opened for a contact
  // Lifecycle-marketing triggers (src/app/api/campaign-triggers/cron/route.ts)
  // — fired at the ACCOUNT level (the clinic itself), for an external
  // tool like Zoho Campaigns/Flow to pick up and send the matching
  // email. Not related to contact/patient-facing messaging above.
  'campaign_trigger.dormant_login_7d', // no one on the account has logged in for 7+ days
  'campaign_trigger.dormant_login_75d', // still dormant 75+ days in — last automated nudge
  'campaign_trigger.stalled_quotes_14d', // quotes sent 14+ days ago with no status change
  'campaign_trigger.zen_off_manual_replies', // WhatsApp connected, AI auto-reply off, meaningful manual reply volume
  'campaign_trigger.cash_payments_weekly', // 3+ cash payments recorded this week
  'campaign_trigger.first_month_milestone', // account just crossed 30 days old
  'account.created', // a new account just signed up (platform-level, see dispatchPlatformWebhookEvent)
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Human-readable descriptions (surfaced in docs / a future UI). */
export const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEvent, string> = {
  'message.received': 'An inbound message was received from a contact',
  'message.status_updated':
    'A message you sent changed delivery status (sent/delivered/read/failed)',
  'conversation.created': 'A new conversation was opened',
  'campaign_trigger.dormant_login_7d': 'No one on the account has logged in for 7+ days',
  'campaign_trigger.dormant_login_75d': 'Still dormant 75+ days in',
  'campaign_trigger.stalled_quotes_14d': 'One or more quotes have sat unanswered for 14+ days',
  'campaign_trigger.zen_off_manual_replies':
    'WhatsApp is connected but AI auto-reply is off, with meaningful manual reply volume this week',
  'campaign_trigger.cash_payments_weekly': '3 or more cash payments were recorded this week',
  'campaign_trigger.first_month_milestone': 'The account just crossed its 30-day usage milestone',
  'account.created': 'A new account just signed up',
};

/** Type-narrow an unknown value into a valid `WebhookEvent`. */
export function isWebhookEvent(value: unknown): value is WebhookEvent {
  return (
    typeof value === 'string' &&
    (WEBHOOK_EVENTS as readonly string[]).includes(value)
  );
}

/**
 * Validate + de-duplicate a caller-supplied event list. Returns the
 * cleaned list, or `null` if any entry is unknown (callers turn that
 * into a 400). An empty list is rejected as `null` too — an endpoint
 * subscribed to nothing is almost certainly a mistake.
 */
export function normalizeEvents(input: unknown): WebhookEvent[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: WebhookEvent[] = [];
  for (const entry of input) {
    if (!isWebhookEvent(entry)) return null;
    if (!out.includes(entry)) out.push(entry);
  }
  return out;
}
