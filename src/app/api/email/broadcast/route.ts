// ============================================================
// POST /api/email/broadcast
//
// Mirrors /api/whatsapp/broadcast's division of labor: this route is
// stateless — it doesn't touch `broadcasts`/`broadcast_recipients` at
// all, the calling hook (use-broadcast-sending.ts) does that itself
// with its own RLS-scoped client, matching results back by contactId.
//
// Wraps each caller-supplied body in the clinic's own paciente shell
// and appends a per-contact unsubscribe link, then batches the actual
// sends through Resend (sendEmailBatch, up to 100/call) instead of
// one sendEmail() per recipient — Resend's real per-request rate
// limit (~2 req/s) is far stricter than a one-by-one loop can respect
// at any real audience size.
// ============================================================

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmailBatch } from "@/lib/email/resend-client";
import { renderShellEmail, pacienteShell, pText } from "@/lib/email/branded-template";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe-token";

interface EmailRecipient {
  contactId: string;
  email: string;
  subject: string;
  /** Already merge-tag-resolved plain text/simple HTML for the body — wrapped in the shell here. */
  bodyHtml: string;
}

interface BroadcastResult {
  contactId: string;
  status: "sent" | "failed";
  resend_message_id?: string;
  error?: string;
}

const CHUNK_SIZE = 100;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://med.zentrolabs.com";

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = checkRateLimit(`emailBroadcast:${user.id}`, RATE_LIMITS.emailBroadcast);
    if (!limit.success) return rateLimitResponse(limit);

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const accountId = profile?.account_id as string | undefined;
    if (!accountId) {
      return NextResponse.json({ error: "Your profile is not linked to an account." }, { status: 403 });
    }

    const { data: account } = await supabase
      .from("accounts")
      .select("name, logo_url, quote_accent_color")
      .eq("id", accountId)
      .maybeSingle();
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const recipients: EmailRecipient[] = Array.isArray(body?.recipients) ? body.recipients : [];
    if (recipients.length === 0) {
      return NextResponse.json({ error: "`recipients` must be a non-empty array" }, { status: 400 });
    }

    const results: BroadcastResult[] = [];

    for (const group of chunk(recipients, CHUNK_SIZE)) {
      try {
        const { ids } = await sendEmailBatch(
          group.map((r) => ({
            to: r.email,
            subject: r.subject,
            html: renderShellEmail({
              shell: pacienteShell(account.name, { logoUrl: account.logo_url, accentColor: account.quote_accent_color }),
              heading: r.subject,
              footerNote: `Enviado por ${account.name}.`,
              blocks: [
                pText(r.bodyHtml),
                `<p style="margin:24px 0 0 0; font-size:11px; color:#999;"><a href="${buildUnsubscribeUrl(r.contactId, accountId, BASE_URL)}" style="color:#999;">Dejar de recibir estos correos</a></p>`,
              ],
            }),
          })),
          account.name,
        );
        group.forEach((r, i) => results.push({ contactId: r.contactId, status: "sent", resend_message_id: ids[i] }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[email broadcast] batch send failed:", err);
        group.forEach((r) => results.push({ contactId: r.contactId, status: "failed", error: message }));
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    return NextResponse.json({ success: true, total: recipients.length, sent, failed: recipients.length - sent, results });
  } catch (error) {
    console.error("Error in email broadcast POST:", error);
    return NextResponse.json({ error: "Failed to process broadcast" }, { status: 500 });
  }
}
