-- ============================================================
-- 143_email_broadcast_opt_out.sql
--
-- Adds an email channel to the existing WhatsApp-only broadcasts
-- feature, with a real opt-out mechanism — mandatory before sending
-- any bulk email, since spam complaints can damage the sending
-- domain's reputation for ALL transactional email (password resets,
-- invoices, etc.), not just campaigns.
--
-- - contacts.opted_out_email: set by the public unsubscribe link
--   (/api/email/unsubscribe). Excluded from every future email
--   broadcast's audience.
-- - broadcasts.channel: distinguishes whatsapp (existing rows,
--   default) from email campaigns.
-- - broadcast_recipients.resend_message_id: Resend's own id per
--   sent email, parallel to the existing whatsapp_message_id — kept
--   as a plain column (no unique index/webhook correlation yet,
--   unlike whatsapp_message_id) since delivery-status webhooks for
--   email aren't built in this pass.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS opted_out_email boolean NOT NULL DEFAULT false;

ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'email'));

ALTER TABLE broadcast_recipients
  ADD COLUMN IF NOT EXISTS resend_message_id text;
