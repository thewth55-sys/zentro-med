-- ============================================================
-- 095_guardians.sql — responsable/tutor reutilizable para pacientes.
--
-- Para pacientes pediátricos (o veterinarios: el dueño de la mascota) hace
-- falta registrar a un responsable/tutor con sus propios datos de contacto,
-- reutilizable entre varios pacientes (p.ej. un padre con varios hijos).
--
--   guardians          — la persona responsable (datos propios).
--   patient_guardians  — relación N:M contacto(paciente) ↔ guardian, con
--                        el parentesco y si es el responsable principal.
--
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS guardians (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name            text NOT NULL,
  phone           text,
  email           text,
  document_type   text,
  document_number text,
  address         text,
  notes           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_guardians (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id   uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id   uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  guardian_id  uuid NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  relationship text,
  is_primary   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_guardians_account ON guardians(account_id);
CREATE INDEX IF NOT EXISTS idx_patient_guardians_contact ON patient_guardians(contact_id);
CREATE INDEX IF NOT EXISTS idx_patient_guardians_guardian ON patient_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_patient_guardians_account ON patient_guardians(account_id);

ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_guardians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardians_select ON guardians;
CREATE POLICY guardians_select ON guardians FOR SELECT USING (is_account_member(account_id));
DROP POLICY IF EXISTS guardians_insert ON guardians;
CREATE POLICY guardians_insert ON guardians FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));
DROP POLICY IF EXISTS guardians_update ON guardians;
CREATE POLICY guardians_update ON guardians FOR UPDATE USING (is_account_member(account_id, 'agent'));
DROP POLICY IF EXISTS guardians_delete ON guardians;
CREATE POLICY guardians_delete ON guardians FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS patient_guardians_select ON patient_guardians;
CREATE POLICY patient_guardians_select ON patient_guardians FOR SELECT USING (is_account_member(account_id));
DROP POLICY IF EXISTS patient_guardians_insert ON patient_guardians;
CREATE POLICY patient_guardians_insert ON patient_guardians FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));
DROP POLICY IF EXISTS patient_guardians_update ON patient_guardians;
CREATE POLICY patient_guardians_update ON patient_guardians FOR UPDATE USING (is_account_member(account_id, 'agent'));
DROP POLICY IF EXISTS patient_guardians_delete ON patient_guardians;
CREATE POLICY patient_guardians_delete ON patient_guardians FOR DELETE USING (is_account_member(account_id, 'agent'));
