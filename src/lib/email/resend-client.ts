import { Resend } from "resend";

/**
 * Direct Resend API integration — sends transactional/notification
 * email from THIS app's own server code, independent of Supabase's
 * SMTP relay (which only ever fires for Supabase Auth's own built-in
 * email types: signup, magic link, password recovery, email change —
 * see docs/auth-email-hook.md for that separate piece). Everything
 * this app itself decides to send (documents to patients, internal
 * team alerts) goes through here instead.
 */

let _client: Resend | null = null;

function resendClient(): Resend {
  if (!_client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
    _client = new Resend(apiKey);
  }
  return _client;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
  /** Overrides the display name the recipient sees (e.g. the clinic's
   *  own name), keeping the underlying address from RESEND_FROM_EMAIL
   *  — clinics don't have their own verified sending domain, so the
   *  address itself can't be tenant-specific, only the display name. */
  fromName?: string;
}

function resolveFrom(fromName?: string): string {
  const configured = process.env.RESEND_FROM_EMAIL;
  if (!configured) throw new Error("RESEND_FROM_EMAIL is not configured");
  if (!fromName) return configured;
  const address = /<([^>]+)>/.exec(configured)?.[1] ?? configured;
  return `${fromName} <${address}>`;
}

/**
 * Fire-and-report email send. Throws on failure — callers decide
 * whether that should surface to the end user (e.g. a toast on a
 * "send by email" button) or just get logged (a background
 * notification that shouldn't block the triggering action).
 */
export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
  const from = resolveFrom(params.fromName);

  const { data, error } = await resendClient().emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Resend returned no data");
  return { id: data.id };
}

export interface BatchEmailItem {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends up to 100 emails in one Resend API call (their batch-sending
 * endpoint) — used for email broadcasts instead of one sendEmail()
 * per recipient, since Resend's real per-request rate limit (~2
 * req/s) is far stricter than looping one-by-one can respect at any
 * real audience size. No attachments/scheduling support (Resend's own
 * batch API limitation) — fine here, campaign emails don't need
 * either. All-or-nothing per call: on success every item in `items`
 * got a real id in the same order; on failure none of them sent —
 * simpler and safer than partial-failure bookkeeping for this scope.
 */
export async function sendEmailBatch(items: BatchEmailItem[], fromName?: string): Promise<{ ids: string[] }> {
  if (items.length === 0) return { ids: [] };
  if (items.length > 100) throw new Error("sendEmailBatch accepts at most 100 items per call");
  const from = resolveFrom(fromName);

  const { data, error } = await resendClient().batch.send(
    items.map((item) => ({ from, to: item.to, subject: item.subject, html: item.html })),
  );

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Resend returned no data");
  return { ids: data.data.map((d) => d.id) };
}
