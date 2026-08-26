-- ============================================================
-- 100_ai_copilot_profile.sql — perfil base del copiloto, POR MÉDICO.
--
-- Complemento estructurado de la memoria libre (099): un onboarding al
-- primer uso captura el contexto base — cómo dirigirse al médico, su
-- giro/especialidad, el tono deseado y cualquier contexto permanente — y
-- se inyecta en el prompt del copiloto en cada sesión. Editable siempre.
--
-- Alcance POR (account_id, user_id), RLS estricta: cada médico solo ve y
-- edita SU perfil. `onboarded_at` marca que ya completó el onboarding para
-- no volver a pedirlo (pero puede editarlo cuando quiera).
--
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_copilot_profile (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id    uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  address_as    text,   -- cómo dirigirse (p. ej. "Dr. López", "Dra. Ana")
  specialty     text,   -- giro / especialidad
  tone          text,   -- 'formal' | 'cercano' | 'breve'
  base_context  text,   -- contexto permanente que el copiloto debe tener presente
  onboarded_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_copilot_profile ENABLE ROW LEVEL SECURITY;

-- Cada médico solo su propio perfil (lectura y escritura).
DROP POLICY IF EXISTS ai_copilot_profile_rw ON ai_copilot_profile;
CREATE POLICY ai_copilot_profile_rw ON ai_copilot_profile FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (is_account_member(account_id, 'agent') AND user_id = auth.uid());
