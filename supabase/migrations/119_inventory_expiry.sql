-- ============================================================
-- 119_inventory_expiry.sql — "Por caducar" for the redesigned
-- Inventario page (now its own sidebar section — see the same move
-- 118 did for Banco y caja). Dental/medical supplies (anesthetics,
-- bonding agents, whitening gel) genuinely expire; there was no
-- field to track that at all before this.
--
-- Nullable — every existing item has no expiry date and stays that
-- way until staff sets one; nothing to backfill.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS expiry_date date;

CREATE INDEX IF NOT EXISTS idx_inventory_items_expiry
  ON inventory_items(account_id, expiry_date) WHERE expiry_date IS NOT NULL;
