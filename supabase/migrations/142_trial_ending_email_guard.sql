-- ============================================================
-- 142_trial_ending_email_guard.sql
--
-- Guard column so the "tu prueba termina en 5 días" email
-- (/api/billing-platform/cron) only ever fires once per account,
-- even though the cron runs daily and an account can sit in the
-- 4-5-day window across more than one run.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS trial_ending_email_sent_at timestamptz;
