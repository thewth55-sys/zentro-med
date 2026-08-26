-- ============================================================
-- 088_ai_copilot.sql — copiloto de IA hacia el usuario (personal de la
-- clínica), Nivel 3: chat con herramientas de lectura y de acción con
-- confirmación humana.
--
-- El copiloto reutiliza la capa de IA existente (proveedor/clave por
-- cuenta, cuota y `ai_usage_log`). Lo único que necesita en la base es
-- poder registrar su gasto de tokens con un `mode` propio: se amplía el
-- CHECK de `ai_usage_log.mode` para incluir 'copilot'.
--
-- El endpoint (/api/ai/copilot) corre con el cliente RLS-scoped del
-- usuario, así que cada herramienta ya queda limitada a su cuenta. Las
-- acciones de escritura NO las ejecuta el modelo: se proponen y el
-- usuario confirma (/api/ai/copilot/execute).
--
-- Idempotente.
-- ============================================================

ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_mode_check;
ALTER TABLE ai_usage_log ADD CONSTRAINT ai_usage_log_mode_check
  CHECK (mode IN ('auto_reply', 'draft', 'copilot'));
