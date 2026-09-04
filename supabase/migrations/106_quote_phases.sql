-- ============================================================
-- 106_quote_phases.sql — Fases de un plan de tratamiento y estado
-- "hecho" por línea, para la vista clínica del paciente.
--
-- `quote_items` ya podía venir de una cita futura o de un hallazgo del
-- odontograma (105_odontogram_quote_link), pero era una lista plana
-- sin agrupación ni forma de marcar avance. `quote_phases` es una
-- tabla hija más de `quotes` — mismo patrón que `quote_items`
-- (039_billing_core): su PROPIA columna `account_id` y su PROPIA RLS,
-- porque RLS en Postgres no hereda de la tabla padre vía FK.
--
-- `quote_items.phase_id` es nullable a propósito: una línea sin fase
-- asignada sigue siendo válida (el mockup de "fases" es una forma de
-- organizar el plan, no un requisito de todas las cotizaciones
-- existentes — las creadas antes de esta migración quedan sin fase,
-- no rotas).
--
-- `quotes.approved_at` separa "cuándo se aceptó" de `issue_date`
-- (cuándo se emitió) y de `updated_at` (que cambia por cualquier
-- edición, no solo al aceptar) — se escribe desde la app cuando el
-- PATCH de /api/billing/quotes/[id] mueve `status` a 'accepted', no
-- vía trigger (mismo estilo que el resto de este módulo: los routes
-- ya son la única fuente de verdad para transiciones de estado).
--
-- Idempotente — segura de correr más de una vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS quote_phases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  quote_id    uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  name        text NOT NULL,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_phases_quote ON quote_phases(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_phases_account ON quote_phases(account_id);

ALTER TABLE quote_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_phases_select ON quote_phases;
CREATE POLICY quote_phases_select ON quote_phases FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS quote_phases_insert ON quote_phases;
CREATE POLICY quote_phases_insert ON quote_phases FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS quote_phases_update ON quote_phases;
CREATE POLICY quote_phases_update ON quote_phases FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS quote_phases_delete ON quote_phases;
CREATE POLICY quote_phases_delete ON quote_phases FOR DELETE
  USING (is_account_member(account_id, 'agent'));

ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES quote_phases(id) ON DELETE SET NULL;

ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_quote_items_phase
  ON quote_items(phase_id)
  WHERE phase_id IS NOT NULL;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;
