-- ============================================================
-- 079_bank_accounts.sql — Phase 2 of the finance module: bank
-- accounts and cash flow, building on Phase 1's expenses (078) and
-- the existing payments (039).
--
-- Design notes
--   - `bank_accounts.opening_balance` + payments/expenses/bank_transactions
--     attributed to it (via the new nullable `bank_account_id` on each)
--     is enough to compute a running balance without a separate
--     ledger/balance-snapshot table — the app computes it the same
--     way Phase 1's P&L summed invoices/expenses in JS, not a new SQL
--     aggregate. `account_number_last4` only, never a full account
--     number — this is reference metadata for staff, not something
--     that needs (or should) be sensitive enough to encrypt.
--   - `bank_transactions` covers cash movements NOT already captured
--     by payments (money in from patients) or expenses (money out for
--     a categorized cost) — owner draws, capital injections, transfers
--     between the clinic's own accounts, bank fees, interest. Each
--     leg of a transfer is its own row (an "out" on the source
--     account, an "in" on the destination) rather than a linked pair
--     — simpler to build and reconcile than double-entry bookkeeping,
--     which this phase doesn't need.
--   - RLS: bank_accounts mirrors expenses/invoices (DELETE is
--     admin-only — a bank account disappearing should be a deliberate
--     admin action, not an accidental agent one). bank_transactions
--     mirrors payments exactly (SELECT viewer, INSERT/DELETE agent,
--     NO update policy — correcting an entry is delete-and-recreate,
--     same reasoning as payments' own module comment in 039).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  bank_name             text,
  account_number_last4  text,
  currency              text NOT NULL DEFAULT 'USD',
  opening_balance       numeric(14,2) NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true,
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_account ON bank_accounts(account_id);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_accounts_select ON bank_accounts;
CREATE POLICY bank_accounts_select ON bank_accounts FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS bank_accounts_insert ON bank_accounts;
CREATE POLICY bank_accounts_insert ON bank_accounts FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS bank_accounts_update ON bank_accounts;
CREATE POLICY bank_accounts_update ON bank_accounts FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS bank_accounts_delete ON bank_accounts;
CREATE POLICY bank_accounts_delete ON bank_accounts FOR DELETE
  USING (is_account_member(account_id, 'admin'));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- bank_transactions — manual cash movements not already covered by
-- payments or expenses.
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  bank_account_id   uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  direction         text NOT NULL CHECK (direction IN ('in', 'out')),
  category          text NOT NULL DEFAULT 'other'
                      CHECK (category IN (
                        'transfer', 'owner_draw', 'capital_contribution',
                        'bank_fee', 'interest', 'other'
                      )),
  amount            numeric(14,2) NOT NULL CHECK (amount > 0),
  description       text NOT NULL,
  transaction_date  date NOT NULL DEFAULT CURRENT_DATE,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id, transaction_date DESC);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_transactions_select ON bank_transactions;
CREATE POLICY bank_transactions_select ON bank_transactions FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS bank_transactions_insert ON bank_transactions;
CREATE POLICY bank_transactions_insert ON bank_transactions FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS bank_transactions_delete ON bank_transactions;
CREATE POLICY bank_transactions_delete ON bank_transactions FOR DELETE
  USING (is_account_member(account_id, 'agent'));

-- ============================================================
-- Attribute existing money-in (payments) and money-out (expenses)
-- records to a specific bank account, optionally — nullable so
-- every existing row stays valid, and staff can keep skipping this
-- field for cash transactions that never touch a bank at all.
-- ============================================================
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_bank_account ON payments(bank_account_id) WHERE bank_account_id IS NOT NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_bank_account ON expenses(bank_account_id) WHERE bank_account_id IS NOT NULL;
