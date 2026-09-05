-- Lista de espera — pacientes esperando un espacio más próximo o
-- específico, para poder ofrecer un hueco que se libera (cancelación,
-- vacío en la agenda) a alguien en vez de que quede vacío. Feature
-- nueva para el rediseño de Agenda ("Ofrecer a lista de espera") —
-- no existía nada parecido en el esquema antes de esta migración.

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id       uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  doctor_id        uuid REFERENCES doctors(id) ON DELETE SET NULL,
  service_type_id  uuid REFERENCES service_types(id) ON DELETE SET NULL,
  notes            text,
  status           text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'booked', 'cancelled')),
  notified_at      timestamptz,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_account_status ON waitlist_entries(account_id, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_doctor ON waitlist_entries(doctor_id);

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waitlist_entries_select ON waitlist_entries;
CREATE POLICY waitlist_entries_select ON waitlist_entries FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS waitlist_entries_insert ON waitlist_entries;
CREATE POLICY waitlist_entries_insert ON waitlist_entries FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS waitlist_entries_update ON waitlist_entries;
CREATE POLICY waitlist_entries_update ON waitlist_entries FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS waitlist_entries_delete ON waitlist_entries;
CREATE POLICY waitlist_entries_delete ON waitlist_entries FOR DELETE
  USING (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON waitlist_entries;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
