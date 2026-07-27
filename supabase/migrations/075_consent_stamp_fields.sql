-- ============================================================
-- 075_consent_stamp_fields.sql — replace the single stamp position
-- (migration 074's stamp_page_number/x/y_fraction) with an array of
-- independently-positioned fields, so staff can place the signature
-- image, the signer's name, and the signed date at three different
-- spots on the page instead of one fixed block.
--
-- stamp_fields shape: a JSON array of
--   { "type": "signature" | "signer_name" | "signed_date",
--     "page": integer (>=1),
--     "x": numeric (0-1, page-relative, left origin),
--     "y": numeric (0-1, page-relative, bottom origin — matches
--          pdf-lib's coordinate system directly) }
--
-- Existing rows (if any were created against migration 074 before
-- this ran) get backfilled: the old single point becomes the
-- signature's position, with name/date placed just above/right of it
-- so nothing regresses to "no stamp at all".
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE consent_templates
  ADD COLUMN IF NOT EXISTS stamp_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE consent_templates
SET stamp_fields = jsonb_build_array(
  jsonb_build_object('type', 'signature', 'page', stamp_page_number, 'x', stamp_x_fraction, 'y', stamp_y_fraction),
  jsonb_build_object('type', 'signer_name', 'page', stamp_page_number, 'x', stamp_x_fraction, 'y', LEAST(stamp_y_fraction + 0.10, 1)),
  jsonb_build_object('type', 'signed_date', 'page', stamp_page_number, 'x', LEAST(stamp_x_fraction + 0.20, 1), 'y', LEAST(stamp_y_fraction + 0.10, 1))
)
WHERE stamp_fields = '[]'::jsonb
  AND stamp_page_number IS NOT NULL;

ALTER TABLE consent_templates
  DROP COLUMN IF EXISTS stamp_page_number,
  DROP COLUMN IF EXISTS stamp_x_fraction,
  DROP COLUMN IF EXISTS stamp_y_fraction;

ALTER TABLE consent_documents
  ADD COLUMN IF NOT EXISTS stamp_fields jsonb;

UPDATE consent_documents
SET stamp_fields = jsonb_build_array(
  jsonb_build_object('type', 'signature', 'page', stamp_page_number, 'x', stamp_x_fraction, 'y', stamp_y_fraction),
  jsonb_build_object('type', 'signer_name', 'page', stamp_page_number, 'x', stamp_x_fraction, 'y', LEAST(stamp_y_fraction + 0.10, 1)),
  jsonb_build_object('type', 'signed_date', 'page', stamp_page_number, 'x', LEAST(stamp_x_fraction + 0.20, 1), 'y', LEAST(stamp_y_fraction + 0.10, 1))
)
WHERE source_type = 'pdf'
  AND stamp_page_number IS NOT NULL
  AND stamp_fields IS NULL;

ALTER TABLE consent_documents
  DROP COLUMN IF EXISTS stamp_page_number,
  DROP COLUMN IF EXISTS stamp_x_fraction,
  DROP COLUMN IF EXISTS stamp_y_fraction;
