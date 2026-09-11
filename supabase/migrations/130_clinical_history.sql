-- ============================================================
-- 130_clinical_history.sql — structured clinical history intake
-- ("Historia clínica" / "Ficha clínica"), one per patient.
--
-- Design notes
--   - ONE row per patient (`UNIQUE(patient_profile_id)`) — this is a
--     single document filled section by section over time, not a
--     log. `sections` is a free-form jsonb bag holding the answers;
--     the actual list of required sections/fields per country
--     (NOM-004-SSA3-2012 for Mexico, Resolución 1995 de 1999 for
--     Colombia) is a hardcoded TS config
--     (src/lib/clinical/history-sections.ts), not stored in the DB —
--     these are normative requirements, not a tenant preference, so
--     a clinic should never be able to remove a legally-required
--     field by editing a config row.
--   - `country_at_signing` snapshots which framework applied when the
--     document was signed — the account's country could theoretically
--     change later (an admin correcting a signup mistake), and a
--     signed legal document should never retroactively reinterpret
--     itself under a different country's rules.
--   - DRAFT vs SIGNED, unlike `clinical_notes` (038): this is
--     genuinely new relative to that table's "immutable from the
--     moment it's saved" model. Here `signed_at` starts NULL (draft,
--     freely re-saveable) and is set exactly once via "Firmar y
--     cerrar" — from that point on, both the RLS UPDATE policy
--     (`signed_at IS NULL`) AND the trigger below independently block
--     any further write, matching this schema's existing
--     belt-and-suspenders pattern for other structural rules (see
--     `enforce_max_two_admins`, 125). Corrections after signing only
--     ever happen via a linked note in `clinical_notes`, never by
--     reopening this row.
--   - `content_hash` (same tamper-evidence pattern as
--     `073_clinical_note_signatures.sql`'s `clinical_notes.content_hash`)
--     lets a later signature-request flow hash exactly what was
--     signed, the same way clinical notes already do.
--
-- RLS
--   Same bar as `clinical_notes` (health data, not every role needs
--   it): SELECT/INSERT/UPDATE require agent+. No DELETE policy at
--   all — once created, a record is either an editable draft (fix it
--   via UPDATE) or a signed legal document (never removable), so
--   there's no legitimate delete path.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS clinical_history_records (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  patient_profile_id   uuid NOT NULL UNIQUE REFERENCES patient_profiles(id) ON DELETE CASCADE,
  country_at_signing   text,
  sections             jsonb NOT NULL DEFAULT '{}'::jsonb,
  signed_at            timestamptz,
  signed_by_doctor_id  uuid REFERENCES doctors(id) ON DELETE SET NULL,
  content_hash         text GENERATED ALWAYS AS (
                          encode(digest(sections::text, 'sha256'), 'hex')
                        ) STORED,
  created_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_history_records_account
  ON clinical_history_records(account_id);

ALTER TABLE clinical_history_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinical_history_records_select ON clinical_history_records;
CREATE POLICY clinical_history_records_select ON clinical_history_records FOR SELECT
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS clinical_history_records_insert ON clinical_history_records;
CREATE POLICY clinical_history_records_insert ON clinical_history_records FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

-- `signed_at IS NULL` in USING: once signed, the row simply stops
-- being updatable through RLS at all (defense in depth alongside the
-- trigger below, which also covers the service-role client).
DROP POLICY IF EXISTS clinical_history_records_update ON clinical_history_records;
CREATE POLICY clinical_history_records_update ON clinical_history_records FOR UPDATE
  USING (is_account_member(account_id, 'agent') AND signed_at IS NULL);

DROP TRIGGER IF EXISTS set_updated_at ON clinical_history_records;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clinical_history_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- Immutability once signed — same intent as clinical_notes' hard
-- trigger, but here the record legitimately starts mutable (draft)
-- and locks the moment `signed_at` is first set.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_clinical_history_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.signed_at IS NOT NULL THEN
    RAISE EXCEPTION 'ZENTRO_CLINICAL_HISTORY_LOCKED: a signed clinical history record cannot be modified'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_clinical_history_immutable ON clinical_history_records;
CREATE TRIGGER trg_enforce_clinical_history_immutable
  BEFORE UPDATE ON clinical_history_records
  FOR EACH ROW EXECUTE FUNCTION enforce_clinical_history_immutable();
