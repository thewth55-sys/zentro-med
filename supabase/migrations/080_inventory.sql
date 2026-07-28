-- ============================================================
-- 080_inventory.sql — Phase 3 of the finance module: inventory of
-- supplies, materials, and instruments, closing out the module
-- started with expenses (078) and bank accounts/cash flow (079).
--
-- Design notes
--   - Same "opening balance + movements" shape as bank_accounts/
--     bank_transactions (079): `inventory_items.initial_stock` plus
--     every `inventory_movements` row for that item, summed
--     (direction-signed) in JS/server the same way a bank balance or
--     Phase 1's P&L was computed — no DB trigger maintaining a
--     running `current_stock` column, so there's nothing to
--     desync if a movement is corrected (deleted + recreated, same
--     reasoning as payments/bank_transactions having no UPDATE policy).
--   - `expense_id` on inventory_movements optionally links a
--     'purchase' movement to the expense record for that purchase —
--     avoids duplicating the same money-out entry in two places;
--     nullable because plenty of stock movements (consumption, waste,
--     adjustments) have no associated expense at all.
--   - RLS: inventory_items follows the expenses/bank_accounts shape
--     (agent can create/manage day-to-day, admin-only to delete an
--     item type entirely) rather than the stricter products/taxes
--     shape (admin for every mutation) — staff need to manage stock
--     levels routinely, unlike the price catalog. inventory_movements
--     mirrors payments/bank_transactions exactly (no UPDATE policy).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name            text NOT NULL,
  category        text NOT NULL DEFAULT 'supplies'
                    CHECK (category IN ('supplies', 'materials', 'instruments', 'equipment', 'other')),
  sku             text,
  unit            text NOT NULL DEFAULT 'unidad',
  unit_cost       numeric(12,2),
  initial_stock   numeric(12,2) NOT NULL DEFAULT 0,
  minimum_stock   numeric(12,2) NOT NULL DEFAULT 0,
  supplier        text,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_account ON inventory_items(account_id);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_items_select ON inventory_items;
CREATE POLICY inventory_items_select ON inventory_items FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS inventory_items_insert ON inventory_items;
CREATE POLICY inventory_items_insert ON inventory_items FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS inventory_items_update ON inventory_items;
CREATE POLICY inventory_items_update ON inventory_items FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS inventory_items_delete ON inventory_items;
CREATE POLICY inventory_items_delete ON inventory_items FOR DELETE
  USING (is_account_member(account_id, 'admin'));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- inventory_movements — stock ledger. direction 'in' covers
-- purchases/restocks and positive adjustments; 'out' covers
-- consumption, waste/breakage, and negative adjustments.
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id           uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  direction         text NOT NULL CHECK (direction IN ('in', 'out')),
  reason            text NOT NULL DEFAULT 'other'
                      CHECK (reason IN ('purchase', 'consumption', 'waste', 'adjustment', 'other')),
  quantity          numeric(12,2) NOT NULL CHECK (quantity > 0),
  unit_cost_at_time numeric(12,2),
  expense_id        uuid REFERENCES expenses(id) ON DELETE SET NULL,
  notes             text,
  movement_date     date NOT NULL DEFAULT CURRENT_DATE,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id, movement_date DESC);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_movements_select ON inventory_movements;
CREATE POLICY inventory_movements_select ON inventory_movements FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS inventory_movements_insert ON inventory_movements;
CREATE POLICY inventory_movements_insert ON inventory_movements FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS inventory_movements_delete ON inventory_movements;
CREATE POLICY inventory_movements_delete ON inventory_movements FOR DELETE
  USING (is_account_member(account_id, 'agent'));
