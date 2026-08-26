-- ============================================================
-- 101_ai_copilot_history.sql — historial del chat de Zen POR MÉDICO,
-- persistido en la base para que siga al usuario ENTRE DISPOSITIVOS.
--
-- Antes se guardaba solo en localStorage (por navegador). Esta tabla lo
-- mueve a la base: un renglón por médico con los últimos turnos del chat.
-- RLS estricta: cada médico solo ve/edita su propio historial.
--
-- Nota de privacidad: guarda contenido de la conversación (posible PHI)
-- de forma durable. Se conservan solo los últimos turnos y el médico puede
-- borrarlo con "Nueva". Definir retención según política de la clínica.
--
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_copilot_history (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  turns       jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_copilot_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_copilot_history_rw ON ai_copilot_history;
CREATE POLICY ai_copilot_history_rw ON ai_copilot_history FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (is_account_member(account_id, 'agent') AND user_id = auth.uid());
