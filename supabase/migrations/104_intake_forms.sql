-- ============================================================
-- 104_intake_forms.sql — per-doctor patient intake / clinical
-- pre-screening form, embedded in the public booking wizard.
--
-- Design notes
--   - `doctors.intake_form_config` (jsonb, nullable) holds the whole
--     form definition — pages, fields, visibility rules, page-jump
--     rules (see src/lib/intake-forms/types.ts for the TS shape).
--     Questions differ by specialty, so this lives per-doctor, not
--     per-account — same reasoning as `doctors.specialty` itself.
--     No new RLS needed: the existing `doctors_update` policy
--     (admin-only, 037_clinic_scheduling_core.sql) already covers it.
--   - `intake_form_submissions` is the log of completed patient
--     answers — one row per new-patient booking that went through the
--     form. `answers` is a DENORMALIZED snapshot
--     ([{page_title, field_id, field_label, field_type, value}]), not
--     a live reference into `intake_form_config` — so a later edit to
--     the doctor's form (renamed/deleted field) never corrupts or
--     blanks out already-submitted history.
--   - No INSERT/UPDATE/DELETE policy for authenticated roles: the
--     only writer is the public booking route via supabaseAdmin(),
--     same posture as `appointment_deposits` (migration 102). No
--     UPDATE trigger use case in v1 (answers are read-only in the
--     Contacts UI) but `set_updated_at` is added anyway for schema
--     consistency with every other table in this app.
--   - SELECT is any account member (not agent+-only) — these are
--     patient-provided answers, not a clinician's own notes, matching
--     `patient_profiles`'s tier (038_clinical_records.sql) rather than
--     `clinical_notes`'s.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS intake_form_config jsonb;

CREATE TABLE IF NOT EXISTS intake_form_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  doctor_id       uuid REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_id  uuid REFERENCES appointments(id) ON DELETE SET NULL,
  answers         jsonb NOT NULL,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_contact
  ON intake_form_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_account
  ON intake_form_submissions(account_id);

ALTER TABLE intake_form_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intake_form_submissions_select ON intake_form_submissions;
CREATE POLICY intake_form_submissions_select ON intake_form_submissions FOR SELECT
  USING (is_account_member(account_id));

-- No INSERT/UPDATE/DELETE policy for authenticated roles — every write
-- happens server-side (the public booking route), via the service-role
-- client.

DROP TRIGGER IF EXISTS set_updated_at ON intake_form_submissions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON intake_form_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
