-- ============================================================
-- 098_ai_copilot_audit.sql — rastro de auditoría de las acciones que el
-- copiloto de IA ejecuta.
--
-- El copiloto (Nivel 3) escribe en el CRM clínico (crear/cancelar citas,
-- notas de evolución, WhatsApp, etc.). Cada acción la PROPONE la IA y la
-- CONFIRMA un humano; este registro deja constancia de quién confirmó qué
-- y cuándo — trazabilidad necesaria por tratarse de datos clínicos.
--
-- Una fila por acción CONFIRMADA y ejecutada (éxito o error). Escritura
-- desde /api/ai/copilot/execute con el cliente RLS del usuario. Lectura
-- solo para admins/dueños de la cuenta (es un log de auditoría).
--
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_copilot_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Quién confirmó la acción. Nullable + SET NULL para que el rastro
  -- sobreviva si el usuario se elimina (un audit log no debe borrarse).
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  params      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      text NOT NULL CHECK (status IN ('ok', 'failed')),
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_copilot_actions_account
  ON ai_copilot_actions(account_id, created_at DESC);

ALTER TABLE ai_copilot_actions ENABLE ROW LEVEL SECURITY;

-- Lectura: solo admins/dueños de la cuenta (es un log de auditoría).
DROP POLICY IF EXISTS ai_copilot_actions_select ON ai_copilot_actions;
CREATE POLICY ai_copilot_actions_select ON ai_copilot_actions FOR SELECT
  USING (is_account_member(account_id, 'admin'));

-- Inserción: cualquier miembro que ejecute (agent+), y solo atribuida a sí mismo.
DROP POLICY IF EXISTS ai_copilot_actions_insert ON ai_copilot_actions;
CREATE POLICY ai_copilot_actions_insert ON ai_copilot_actions FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') AND user_id = auth.uid());
