-- ============================================================
-- 099_ai_copilot_memory.sql — memoria duradera del copiloto, POR MÉDICO.
--
-- Hechos estables que el médico comparte (su giro/especialidad, horarios,
-- preferencias de trato, contexto recurrente). El copiloto los guarda con
-- la herramienta `recordar` y se inyectan en su prompt en cada sesión, para
-- que "recuerde" entre conversaciones sin re-preguntar.
--
-- Alcance POR (account_id, user_id): la memoria de un médico es suya y de
-- su cuenta. RLS lo aísla estrictamente — un médico nunca ve la memoria de
-- otro, ni de otra clínica. No guarda transcripciones completas ni PHI de
-- pacientes (esos datos se consultan en vivo por RLS, no se memorizan).
--
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_copilot_memory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_copilot_memory_user
  ON ai_copilot_memory(account_id, user_id, created_at DESC);

ALTER TABLE ai_copilot_memory ENABLE ROW LEVEL SECURITY;

-- Cada médico solo ve / escribe / borra SU propia memoria, dentro de su cuenta.
DROP POLICY IF EXISTS ai_copilot_memory_select ON ai_copilot_memory;
CREATE POLICY ai_copilot_memory_select ON ai_copilot_memory FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_copilot_memory_insert ON ai_copilot_memory;
CREATE POLICY ai_copilot_memory_insert ON ai_copilot_memory FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') AND user_id = auth.uid());

DROP POLICY IF EXISTS ai_copilot_memory_delete ON ai_copilot_memory;
CREATE POLICY ai_copilot_memory_delete ON ai_copilot_memory FOR DELETE
  USING (user_id = auth.uid());
