-- ============================================================
-- 132_prescriptions.sql — Receta / prescription issuance.
--
-- Design notes
--   - Same lifecycle as `clinical_notes` (038), NOT the draft/sign
--     model used by `clinical_history_records` (130): the mockup's
--     Receta screen builds the prescription up in local UI state and
--     has a single "Firmar y emitir receta" action — there is no
--     separate "guardar borrador" step. So the DB row is created
--     ONCE, already signed (`signed_at DEFAULT now()`), and is
--     immutable from that moment — same hard
--     `BEFORE UPDATE OR DELETE` trigger pattern as `clinical_notes`/
--     `clinical_note_addenda`, applied to BOTH `prescriptions` and
--     `prescription_items` (a prescription's medication list is as
--     much a legal record as the prescription row itself).
--   - `prescription_type` and the exact legal citation vary by
--     country (Mexico: receta simple/antibiótico/especial; Colombia:
--     prescripción simple/MIPRES/control especial) — fixed value
--     lists live in TS (src/lib/clinical/prescription-types.ts), same
--     "normative, not tenant-editable" reasoning as
--     history-sections.ts.
--   - `country_at_issue` snapshots which framework applied at
--     issuance — same reasoning as `clinical_history_records
--     .country_at_signing`: a signed legal document shouldn't
--     retroactively reinterpret itself if the account's country is
--     ever corrected later.
--   - No `content_hash` here (unlike `clinical_notes`/
--     `clinical_history_records`): those hash a single row's own
--     text columns, but a prescription's real content spans the
--     parent row AND its `prescription_items` — a GENERATED column
--     can only see its own row, so a meaningful hash would need a
--     trigger-maintained field, not a generated column. Skipped for
--     v1 since prescriptions don't go through the async
--     patient-e-signature request flow those hashes exist for (the
--     prescriber signs in-app, not the patient) — nothing currently
--     reads or verifies a prescription content hash. Revisit if a
--     verification/QR flow is added later.
--   - Folio numbering reuses `next_billing_number()` (039) with two
--     new `billing_counters.doc_type` values, 'prescription_mx' and
--     'prescription_co' (rather than adding a country parameter to
--     that function) — this needs NO signature change to
--     `next_billing_number`, so there's no risk of the overload trap
--     documented in 127/128 (CREATE OR REPLACE with a different
--     parameter list creates a new overload instead of replacing the
--     function). An account only ever has one country at a time, so
--     in practice each account only ever uses one of the two
--     doc_types.
--
-- RLS
--   Same bar as `clinical_notes`: SELECT/INSERT require agent+; no
--   UPDATE/DELETE policy at all on either table (immutable legal
--   record), reinforced by the hard triggers below.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE billing_counters
  DROP CONSTRAINT IF EXISTS billing_counters_doc_type_check;
ALTER TABLE billing_counters
  ADD CONSTRAINT billing_counters_doc_type_check
    CHECK (doc_type IN ('quote', 'invoice', 'prescription_mx', 'prescription_co'));

CREATE OR REPLACE FUNCTION next_billing_number(p_account_id uuid, p_doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number integer;
  v_prefix text;
BEGIN
  INSERT INTO billing_counters (account_id, doc_type, next_number)
  VALUES (p_account_id, p_doc_type, 2)
  ON CONFLICT (account_id, doc_type)
    DO UPDATE SET next_number = billing_counters.next_number + 1
  RETURNING next_number - 1 INTO v_number;

  v_prefix := CASE p_doc_type
    WHEN 'quote' THEN 'COT-'
    WHEN 'prescription_mx' THEN 'REC-'
    WHEN 'prescription_co' THEN 'PRE-'
    ELSE 'FAC-'
  END;
  RETURN v_prefix || lpad(v_number::text, 5, '0');
END;
$$;

-- ------------------------------------------------------------
-- prescriptions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  patient_profile_id uuid NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id          uuid REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_id     uuid REFERENCES appointments(id) ON DELETE SET NULL,
  clinical_note_id   uuid REFERENCES clinical_notes(id) ON DELETE SET NULL,
  prescription_type  text NOT NULL,
  folio              text NOT NULL,
  country_at_issue   text NOT NULL,
  indications        text,
  follow_up          jsonb NOT NULL DEFAULT '{}'::jsonb,
  signed_at          timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient
  ON prescriptions(patient_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_account ON prescriptions(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prescriptions_folio ON prescriptions(account_id, folio);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prescriptions_select ON prescriptions;
CREATE POLICY prescriptions_select ON prescriptions FOR SELECT
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS prescriptions_insert ON prescriptions;
CREATE POLICY prescriptions_insert ON prescriptions FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

-- Deliberately no UPDATE / DELETE policy — see header comment.

CREATE OR REPLACE FUNCTION public.reject_prescription_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'ZENTRO_PRESCRIPTION_IMMUTABLE: a prescription is a signed legal record and cannot be changed or deleted'
    USING ERRCODE = '22023';
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_prescription_update ON prescriptions;
CREATE TRIGGER trg_reject_prescription_update
  BEFORE UPDATE OR DELETE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION reject_prescription_mutation();

-- ------------------------------------------------------------
-- prescription_items — the medication list. Own account_id + own
-- RLS policy rather than relying on a join back to `prescriptions`,
-- same reasoning `invoice_items`/`quote_items` (039) already
-- document: RLS in Postgres has no implicit inheritance from a
-- parent row via FK.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescription_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id             uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  prescription_id        uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  position               integer NOT NULL DEFAULT 0,
  generic_name           text NOT NULL,
  concentration          text,
  brand_name             text,
  presentation           text,
  dose                   text,
  route                  text,
  frequency              text,
  duration               text,
  quantity_to_dispense   text,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription
  ON prescription_items(prescription_id, position);

ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prescription_items_select ON prescription_items;
CREATE POLICY prescription_items_select ON prescription_items FOR SELECT
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS prescription_items_insert ON prescription_items;
CREATE POLICY prescription_items_insert ON prescription_items FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

-- Deliberately no UPDATE / DELETE policy — see header comment.

DROP TRIGGER IF EXISTS trg_reject_prescription_item_update ON prescription_items;
CREATE TRIGGER trg_reject_prescription_item_update
  BEFORE UPDATE OR DELETE ON prescription_items
  FOR EACH ROW EXECUTE FUNCTION reject_prescription_mutation();
