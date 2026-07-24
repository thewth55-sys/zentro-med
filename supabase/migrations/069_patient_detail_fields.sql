-- ============================================================
-- 069_patient_detail_fields.sql — richer patient/contact detail
-- fields, split across the two tables the detail view already reads
-- from:
--
--   contacts (identity-level, shown in the "Detalles" tab):
--     first_name, last_name, nickname, landline_phone, address,
--     lead_source
--
--   patient_profiles (clinical/administrative, shown in the "Médico"
--   tab): document_type, document_number, birth_date, birth_country,
--     hc_number, insurance_provider, business_line, patient_group,
--     occupation, sex
--
-- `name` stays the single source every other part of the app already
-- reads (avatar initials, message previews, search, exports, WhatsApp
-- personalization). Rather than touch every call site, a trigger
-- keeps `name` in sync whenever first_name/last_name actually change
-- in a given write — callers that only ever set `name` directly (the
-- quick "add contact" form, the WhatsApp webhook's contact upsert,
-- CSV import) are completely unaffected, since the trigger only fires
-- when THIS write's first_name/last_name differ from what was
-- already stored (IS DISTINCT FROM), not merely "happen to be
-- non-null" — otherwise a direct `name`-only edit on a contact that
-- already had first_name/last_name set would get silently
-- overwritten back to the split-name concatenation.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS landline_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS lead_source TEXT;

CREATE OR REPLACE FUNCTION public.sync_contact_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
      NEW.name := NULLIF(trim(concat_ws(' ', NEW.first_name, NEW.last_name)), '');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.first_name IS DISTINCT FROM OLD.first_name
       OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
      NEW.name := NULLIF(trim(concat_ws(' ', NEW.first_name, NEW.last_name)), '');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_contact_name_trigger ON contacts;
CREATE TRIGGER sync_contact_name_trigger
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION public.sync_contact_name();

ALTER TABLE patient_profiles
  ADD COLUMN IF NOT EXISTS document_type TEXT,
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS birth_country TEXT,
  ADD COLUMN IF NOT EXISTS hc_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
  ADD COLUMN IF NOT EXISTS business_line TEXT,
  ADD COLUMN IF NOT EXISTS patient_group TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS sex TEXT;
