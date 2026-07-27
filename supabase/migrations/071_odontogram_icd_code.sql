-- ============================================================
-- 071_odontogram_icd_code.sql — optional ICD diagnostic code per
-- tooth, alongside its condition/notes. Free text (not a foreign key
-- into a codes table) since ICD-10 vs ICD-11 and exact code sets vary
-- by country — the field just needs to hold whatever code the doctor
-- charting the tooth actually uses.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE odontogram_teeth
  ADD COLUMN IF NOT EXISTS icd_code text;
