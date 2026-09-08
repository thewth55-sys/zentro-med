-- ============================================================
-- 120_treatment_catalog_unification.sql — closes two real gaps the
-- redesigned "Precios" screen (Finanzas → Precios) surfaced:
--
--   - No `category` existed anywhere for a treatment. Nullable with a
--     'other' default so every existing row stays valid uncategorized
--     until staff sets one.
--   - `service_types.is_active` was doing double duty: the ONLY gate
--     for both "usable when scheduling internally" and "shown on the
--     public booking page" (047/109). That meant there was no way to
--     keep a treatment schedulable by staff while hiding it from
--     public self-booking. `visible_in_booking` is a second,
--     independent gate — the public booking query (see
--     src/lib/scheduling/public-booking.ts) now requires BOTH
--     `is_active` and `visible_in_booking`, so nothing changes for
--     existing rows (default true) until an admin deliberately
--     flips it off for one treatment.
--
-- Price sync (service_types.price ↔ products.unit_price) is NOT a
-- trigger — same reasoning as computed_balance/computed_stock
-- elsewhere in this schema (039/079/080): the write path is simple
-- enough (one admin-tier UI) to keep in application code, where it's
-- easier to see and change than a DB trigger. See the Precios page
-- component for the actual sync-on-save logic.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE service_types
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('diagnostic', 'preventive', 'restorative', 'rehabilitation', 'esthetic', 'orthodontics', 'other')),
  ADD COLUMN IF NOT EXISTS visible_in_booking boolean NOT NULL DEFAULT true;
