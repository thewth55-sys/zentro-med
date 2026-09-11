-- ============================================================
-- 134_prescription_signature.sql — replaces the reusable
-- "profiles.signature_url" from migration 133 with a per-prescription
-- signature + verification token.
--
-- Why the reversal
--   A stored, silently-reused autograph signature is a real security
--   weakness for a controlled medical document: whoever has UI access
--   could emit a prescription "signed" with an image captured once,
--   with no proof the actual prescriber was present for THIS
--   document. Confirmed with the user: the doctor must draw their
--   signature fresh every time a prescription is issued, and each
--   signing event gets its own unique verification token stamped on
--   the document (visible on the PDF, matching the "SHA 4f8a…c21e"
--   style stamp in the original mockup) — that token, not a reusable
--   image, is what makes each prescription individually verifiable.
--
-- `signature_storage_path`/`verification_token` are set exactly once,
-- in the SAME insert that creates the row (prescriptions are
-- immutable from creation — migration 132's trigger would reject a
-- later UPDATE to attach them after the fact). The app uploads the
-- freshly-drawn signature PNG to a token-keyed storage path BEFORE
-- inserting the prescription row, then includes the path + token in
-- that single insert.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE profiles
  DROP COLUMN IF EXISTS signature_url;

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS signature_storage_path text,
  ADD COLUMN IF NOT EXISTS verification_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prescriptions_verification_token
  ON prescriptions(verification_token) WHERE verification_token IS NOT NULL;
