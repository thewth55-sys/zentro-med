// ============================================================
// GET /api/email/unsubscribe?token=...
//
// Public. Verifies the stateless HMAC token (see unsubscribe-token.ts)
// and marks contacts.opted_out_email = true. Every future email
// broadcast's audience excludes opted-out contacts — this is the
// minimum viable compliance mechanism before sending bulk email at
// all, since spam complaints can damage the sending domain's
// reputation for every transactional email, not just campaigns.
//
// Returns plain HTML (a human clicks this from their email client),
// not JSON.
// ============================================================

import { supabaseAdmin } from "@/lib/billing-platform/admin-client";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";

function page(message: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Zentro Med</title></head>
    <body style="font-family: Helvetica, Arial, sans-serif; background:#f4f4f5; margin:0; padding:48px 24px; text-align:center;">
      <div style="max-width:420px; margin:0 auto; background:#fff; border-radius:8px; padding:32px;">
        <p style="font-size:15px; color:#1a1a1a; line-height:1.6;">${message}</p>
      </div>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const verified = verifyUnsubscribeToken(token);
  if (!verified) {
    return page("Este enlace no es válido.");
  }

  const admin = supabaseAdmin();
  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("id", verified.contactId)
    .eq("account_id", verified.accountId)
    .maybeSingle();
  if (!contact) {
    return page("Este enlace no es válido.");
  }

  await admin.from("contacts").update({ opted_out_email: true }).eq("id", verified.contactId);

  return page("Listo — ya no recibirás más correos de este tipo de nuestra parte.");
}
