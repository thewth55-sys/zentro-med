-- ============================================================
-- 068_plan_rename_esencial_profesional_clinica.sql — renames the
-- three paid plan tiers to match the redesigned landing page/pricing:
--   standalone            -> esencial     ($49,  same shape)
--   zentro_salud_starter  -> profesional  ($299 -> $99)
--   zentro_salud_pro      -> clinica      ($499 -> $149)
--
-- The price change itself lives in src/lib/billing-platform/plans.ts
-- and in Stripe (new products/prices still need to be created there —
-- see CLAUDE.md). This migration only renames the plan identifier and
-- carries forward any existing account onto its renamed tier, at
-- whatever price its Stripe subscription already has — nobody's
-- actual bill changes from this migration alone.
--
-- Patient-limit numbers are unchanged (1000/5000/unlimited), so the
-- enforce_patient_limit() trigger (064) just needs its CASE labels
-- updated to match, not its numbers.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- Drop the old CHECK constraint before the data can be updated to the
-- new values (constraint would otherwise reject the UPDATE below).
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_plan_check;

UPDATE accounts SET plan = 'esencial' WHERE plan = 'standalone';
UPDATE accounts SET plan = 'profesional' WHERE plan = 'zentro_salud_starter';
UPDATE accounts SET plan = 'clinica' WHERE plan = 'zentro_salud_pro';

ALTER TABLE accounts
  ADD CONSTRAINT accounts_plan_check
  CHECK (plan IN ('trial', 'esencial', 'profesional', 'clinica'));

-- Same batch: the AI quota unit changed from a monthly token budget
-- to a monthly *response count* (see src/lib/ai/quota.ts and the
-- landing page's "300/2.000/6.000 respuestas al mes" copy) — rename
-- the override column so it no longer says "token" for something
-- that's now a response count. Guarded so a second run (the old
-- column no longer existing) doesn't error.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'ai_token_limit_override'
  ) THEN
    ALTER TABLE accounts RENAME COLUMN ai_token_limit_override TO ai_response_limit_override;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION enforce_patient_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan text;
  v_limit integer;
  v_count integer;
BEGIN
  SELECT plan INTO v_plan FROM accounts WHERE id = NEW.account_id;

  v_limit := CASE v_plan
    WHEN 'esencial' THEN 1000
    WHEN 'profesional' THEN 5000
    ELSE NULL
  END;

  IF v_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM patient_profiles WHERE account_id = NEW.account_id;
    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'ZENTRO_PATIENT_LIMIT: this account has reached its plan''s patient limit (%)', v_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
