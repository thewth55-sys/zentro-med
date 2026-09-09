-- ============================================================
-- 121_products_category.sql — the redesigned "Precios" screen
-- (120_treatment_catalog_unification.sql) needs to list plain
-- billable items too, not just treatments (service_types) — a
-- take-home whitening kit or a retail toothbrush has a price but no
-- duration and isn't something a patient schedules. Those are
-- `products` rows with no `service_types.product_id` pointing at
-- them ("standalone" products).
--
-- Reuses the exact same category set as service_types (120) rather
-- than a second enum — one shared vocabulary for "what kind of
-- line item is this" across both tables, and 'other' already covers
-- non-clinical retail items adequately.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('diagnostic', 'preventive', 'restorative', 'rehabilitation', 'esthetic', 'orthodontics', 'other'));
