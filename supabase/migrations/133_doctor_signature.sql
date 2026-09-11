-- ============================================================
-- 133_doctor_signature.sql — a doctor's own reusable autograph
-- signature + the institution that issued their professional
-- license (Cédula Profesional / título), both needed on a
-- prescription PDF (Reglamento de Insumos para la Salud / Decreto
-- 2200 de 2005 both require the prescriber's identity to be fully
-- stated).
--
-- Lives on `profiles` (personal, per-login), same table as the
-- existing `license_number` (050_room_address_and_profile_fields.sql)
-- — a physical signature belongs to the person, not to any one
-- `doctors` row in a particular account, so it's captured once and
-- reused everywhere that person prescribes.
--
-- `signature_url` stores a STORAGE PATH (same convention as
-- `clinical_note_signatures.signature_storage_path`), not a public
-- URL — resolved to a signed URL on read via the existing
-- `getClinicalPhotoUrl` helper.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS license_institution text;
