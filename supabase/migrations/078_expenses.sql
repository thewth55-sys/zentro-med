-- ============================================================
-- 078_expenses.sql — Phase 1 of the finance module: expenses, so a
-- basic profit/loss view (payments collected minus expenses) is
-- possible without waiting on the later bank-accounts/cash-flow and
-- inventory phases.
--
-- Design notes
--   - `category` is a fixed CHECK-constrained set (matches this
--     schema's own convention for quote/invoice `status`, etc.)
--     rather than a free-text field or a separate lookup table —
--     a clinic's expense categories don't vary account to account
--     enough to justify a settings-tier table like `products`/`taxes`.
--   - No receipt/attachment column yet — deliberately out of scope
--     for phase 1; add a `receipt_storage_path` column later if
--     needed, same pattern as visit_photos' `storage_path`.
--   - RLS mirrors `invoices` (039), not `quotes`: an expense is a
--     financial record of money actually leaving the business, same
--     sensitivity class as an invoice — DELETE is admin-only, not
--     agent, so an expense can't quietly disappear from a P&L report.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category        text NOT NULL DEFAULT 'other'
                    CHECK (category IN (
                      'rent', 'payroll', 'supplies', 'utilities',
                      'marketing', 'equipment', 'taxes', 'software', 'other'
                    )),
  description     text NOT NULL,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  currency        text NOT NULL DEFAULT 'USD',
  expense_date    date NOT NULL DEFAULT CURRENT_DATE,
  vendor          text,
  payment_method  text NOT NULL DEFAULT 'other'
                    CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
  notes           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_account ON expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_account_date ON expenses(account_id, expense_date DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expenses_select ON expenses;
CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS expenses_insert ON expenses;
CREATE POLICY expenses_insert ON expenses FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS expenses_update ON expenses;
CREATE POLICY expenses_update ON expenses FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS expenses_delete ON expenses;
CREATE POLICY expenses_delete ON expenses FOR DELETE
  USING (is_account_member(account_id, 'admin'));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
