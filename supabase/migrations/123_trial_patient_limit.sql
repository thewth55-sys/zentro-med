-- ============================================================
-- 123_trial_patient_limit.sql — the free trial now gets a real
-- patient-record cap (10), matching src/lib/billing-platform/plans.ts's
-- PLAN_CONFIG.trial.patientLimit. Previously `trial` fell into the
-- trigger's `ELSE NULL` branch (uncapped) alongside `clinica`, which
-- was fine when the trial had no real quota story — now that it's an
-- explicit product decision, it needs its own CASE label instead of
-- silently sharing "unlimited" with clinica.
--
-- Idempotent — safe to run multiple times (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_patient_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan text;
  v_limit integer;
  v_count integer;
BEGIN
  SELECT plan INTO v_plan FROM accounts WHERE id = NEW.account_id;

  v_limit := CASE v_plan
    WHEN 'trial' THEN 10
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
