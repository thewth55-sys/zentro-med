-- ============================================================
-- 145_marketing_content_pieces.sql — Aprobación de contenido de
-- Marketing (parte 1 de 4: solo la base de datos).
--
-- Design notes
--   - Piezas de contenido (reel/carrusel/historia) que el admin de
--     plataforma sube para una clínica vía Google Drive link; la
--     clínica las aprueba/rechaza/comenta desde su dashboard.
--   - Sin policy de INSERT ni DELETE para el cliente: esas filas las
--     crea únicamente el admin de plataforma vía service role
--     (bypassa RLS), mismo patrón que el resto de la suite de
--     admin (`supabaseAdmin()`).
--   - `accounts.marketing_addon` se agrega aquí para tenerla lista,
--     pero todavía no gatea nada (nav ni página) — eso se decide
--     después.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS marketing_content_pieces (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id             uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title                  text NOT NULL,
  content_type           text NOT NULL CHECK (content_type IN ('reel', 'carrusel', 'historia')),
  drive_url              text NOT NULL,
  scheduled_publish_at   timestamptz,
  status                 text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  feedback               text,
  reviewed_by_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_content_pieces_account
  ON marketing_content_pieces(account_id, created_at DESC);

ALTER TABLE marketing_content_pieces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_content_pieces_select ON marketing_content_pieces;
CREATE POLICY marketing_content_pieces_select ON marketing_content_pieces FOR SELECT
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS marketing_content_pieces_update ON marketing_content_pieces;
CREATE POLICY marketing_content_pieces_update ON marketing_content_pieces FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

-- Deliberadamente sin policy de INSERT ni DELETE — ver header comment.

DROP TRIGGER IF EXISTS set_updated_at ON marketing_content_pieces;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON marketing_content_pieces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS marketing_addon boolean NOT NULL DEFAULT false;
