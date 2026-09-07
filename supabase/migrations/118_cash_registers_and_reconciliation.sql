-- ============================================================
-- 118_cash_registers_and_reconciliation.sql — "Banco y caja" becomes
-- its own section (out of Finanzas), matching two real gaps its
-- redesign surfaced:
--
--   - There was no concept of "the cash box for today's shift" —
--     cash payments/expenses just floated, attributed to no account
--     at all unless staff manually picked a bank_account_id for them
--     (which cash realistically never has until it's deposited).
--     `cash_registers` gives cash the same "opening balance + its own
--     movements" shape bank_accounts already has, scoped to a shift
--     (open → close) instead of being open-ended. Only one row can be
--     'open' per account at a time (partial unique index) — a second
--     "open" attempt should fail loudly, not silently create a
--     concurrent shift.
--   - `bank_transactions` had no way to say "this deposit belongs to
--     patient X's invoice" — every manual entry was anonymous. The
--     nullable `invoice_id` lets staff reconcile a raw bank deposit
--     (received as a generic 'other' category transfer, direction
--     'in') to the invoice it actually paid, once known. Scoped
--     deliberately to that case: a reconciliation flow has no reason
--     to touch expenses/owner draws/interest, so this is additive
--     only, no behavior change for existing rows (all NULL).
--
-- RLS mirrors bank_accounts (039/079): SELECT any member, INSERT/UPDATE
-- agent+ (opening/closing a shift is an operational action, same tier
-- as recording a payment or expense).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS cash_registers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  opening_balance  numeric(14,2) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  status           text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at        timestamptz NOT NULL DEFAULT now(),
  opened_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at        timestamptz,
  closed_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Snapshot of "fondo + cobros − gastos" at the moment of close, so a
  -- past shift's total doesn't silently drift if a payment is later
  -- deleted — same reasoning as invoice line items snapshotting their
  -- tax rate (039) instead of always reading the live rate.
  closing_balance  numeric(14,2),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_registers_one_open
  ON cash_registers(account_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_cash_registers_account
  ON cash_registers(account_id, opened_at DESC);

ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_registers_select ON cash_registers;
CREATE POLICY cash_registers_select ON cash_registers FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS cash_registers_insert ON cash_registers;
CREATE POLICY cash_registers_insert ON cash_registers FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS cash_registers_update ON cash_registers;
CREATE POLICY cash_registers_update ON cash_registers FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON cash_registers;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cash_registers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- Reconciliation link — see header comment.
-- ------------------------------------------------------------
ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bank_transactions_invoice
  ON bank_transactions(invoice_id) WHERE invoice_id IS NOT NULL;
