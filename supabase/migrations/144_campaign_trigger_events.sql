-- ============================================================
-- 144_campaign_trigger_events.sql
--
-- Idempotency/audit table for the lifecycle-marketing campaign
-- triggers cron (src/app/api/campaign-triggers/cron/route.ts). Each
-- row means "this account was notified about this trigger at this
-- time" — the cron checks for a recent row before firing again
-- (window length is trigger-specific, decided in application code,
-- not enforced here) and inserts one right after a successful
-- dispatchWebhookEvent() call.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_trigger_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  trigger_key text NOT NULL,
  fired_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_trigger_events_lookup
  ON campaign_trigger_events(account_id, trigger_key, fired_at DESC);

-- No RLS policy needed — only ever read/written by the cron route via
-- the service-role client (supabaseAdmin()), same posture as other
-- cron-owned tables (e.g. appointment_reminders).
ALTER TABLE campaign_trigger_events ENABLE ROW LEVEL SECURITY;
