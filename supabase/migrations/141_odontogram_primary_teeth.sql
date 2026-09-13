-- ============================================================
-- 141_odontogram_primary_teeth.sql — widen odontogram_teeth to also
-- accept primary/deciduous dentition (FDI quadrants 5-8).
--
-- 066_odontogram.sql shipped permanent-only (quadrants 1-4, 32 teeth)
-- and said so explicitly in its own header comment. A pediatric or
-- mixed-dentition patient (roughly ages 6-12) has BOTH permanent and
-- primary teeth present at once, so this is additive — it widens the
-- existing CHECK rather than replacing it, and doesn't touch any
-- existing row.
--
-- FDI primary numbering: 5 teeth per quadrant (no premolars/molars 6-8
-- in a quadrant, deciduous dentition tops out at the second molar):
--   51-55 (upper right), 61-65 (upper left),
--   71-75 (lower left),  81-85 (lower right).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE odontogram_teeth DROP CONSTRAINT IF EXISTS odontogram_teeth_tooth_number_check;

ALTER TABLE odontogram_teeth ADD CONSTRAINT odontogram_teeth_tooth_number_check CHECK (
  tooth_number IN (
    11,12,13,14,15,16,17,18,
    21,22,23,24,25,26,27,28,
    31,32,33,34,35,36,37,38,
    41,42,43,44,45,46,47,48,
    51,52,53,54,55,
    61,62,63,64,65,
    71,72,73,74,75,
    81,82,83,84,85
  )
);
