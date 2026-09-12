-- ============================================================
-- 135_clinical_history_rls_fix.sql — fixes "No se pudo firmar la
-- historia clínica" — the sign action itself was rejected by its own
-- RLS policy.
--
-- Root cause
--   130's UPDATE policy was written as a single USING clause:
--     USING (is_account_member(account_id, 'agent') AND signed_at IS NULL)
--   When a Postgres RLS policy has no explicit WITH CHECK, the SAME
--   expression is reused as the WITH CHECK — which is evaluated
--   against the NEW row, not the old one. The whole point of
--   "Firmar y cerrar" is to set signed_at from NULL to NOT NULL, so
--   the resulting row always fails `signed_at IS NULL` — meaning the
--   one update this table most needs to allow (the actual signing)
--   was the one RLS always rejected. Saving a draft happened to work
--   because it never changes signed_at away from NULL.
--
-- Fix
--   Keep USING as the pre-image gate (only an unsigned/draft row can
--   be targeted at all — this is what makes the row immutable once
--   signed, together with the trigger from 130), but give WITH CHECK
--   its own expression that doesn't re-check signed_at, so the
--   NULL → NOT NULL transition is allowed through.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

DROP POLICY IF EXISTS clinical_history_records_update ON clinical_history_records;
CREATE POLICY clinical_history_records_update ON clinical_history_records FOR UPDATE
  USING (is_account_member(account_id, 'agent') AND signed_at IS NULL)
  WITH CHECK (is_account_member(account_id, 'agent'));
