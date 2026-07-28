-- ============================================================
-- 081_bank_transactions_update.sql — allow editing bank_transactions
-- in place, overturning 079's original "no UPDATE, delete+recreate"
-- design (same reasoning payments still uses). Staff asked to be
-- able to correct and recategorize a movement without losing its
-- id/created_at — agent-level, matching the existing INSERT/DELETE
-- policies on this table.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

DROP POLICY IF EXISTS bank_transactions_update ON bank_transactions;
CREATE POLICY bank_transactions_update ON bank_transactions FOR UPDATE
  USING (is_account_member(account_id, 'agent'));
