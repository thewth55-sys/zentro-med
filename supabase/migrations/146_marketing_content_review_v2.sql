-- ============================================================
-- 146_marketing_content_review_v2.sql — rediseño del módulo de
-- Aprobación de contenido de Marketing para calzar con el mockup
-- real del producto (grid + tabs + pantalla de detalle), que la
-- primera pasada (145) no conocía.
--
-- Design notes
--   - `status` gana un 4º valor, 'published' — se marca a mano desde
--     el admin de plataforma cuando la pieza ya salió al aire; no hay
--     automatización por `scheduled_publish_at` (nadie confirma que
--     de verdad se publicó solo por llegar la fecha). Deliberadamente
--     NO se agrega ningún campo de métricas (alcance/citas) — el
--     mockup las muestra, pero dependen de atribución de anuncios que
--     es un proyecto aparte, fuera de alcance aquí.
--   - `description`: la "bajada" corta que el mockup muestra bajo el
--     título de cada tarjeta (ej. "La doctora explica en 30
--     segundos..."), distinta del título. Nullable — piezas viejas de
--     la v1 no la tienen.
--   - `compliance_checklist`: bullets de cumplimiento que el ADMIN
--     redacta al subir la pieza (el mockup dice "revisado por el
--     equipo antes de llegarte" — es informativo para la clínica, no
--     algo que ella marca/edita). `text[]` simple, sin tabla aparte:
--     no hace falta ordenar/editar ítems individuales.
--   - `accounts.marketing_executive_id`: la "ejecutiva asignada" que
--     aparece en varias pantallas del mockup. Referencia
--     `platform_admins` (el roster de staff que ya existe, ver
--     `GET /api/platform-admin/team`) en vez de inventar un
--     directorio de empleados nuevo. Nullable — la UI cae a un
--     genérico "Equipo de Zentro Labs" si no se ha asignado.
--   - `marketing_content_comments`: hilo de comentarios entre la
--     clínica y el staff sobre una pieza — no existía ningún patrón
--     de comentarios multi-autor en el repo (confirmado). `author_type`
--     distingue el lado; `author_name` va denormalizado (snapshot) a
--     propósito porque el staff no tiene fila en `profiles` (no son
--     miembros de la cuenta) y no vale la pena forzar un join cross-
--     tabla solo para mostrar un nombre. Inmutable — sin policy de
--     UPDATE/DELETE, mismo criterio que otros registros de auditoría/
--     conversación en el repo.
--
-- RLS de marketing_content_comments
--   SELECT: is_account_member(account_id, 'viewer').
--   INSERT: is_account_member(account_id, 'agent') AND el comentario
--   se inserta a nombre de uno mismo (author_type='clinic',
--   author_user_id = auth.uid()) — evita que un miembro de la cuenta
--   inserte un comentario fingiendo ser 'staff'. El lado staff
--   inserta vía supabaseAdmin() desde la ruta de admin (bypassa RLS),
--   mismo posture que el resto del módulo.
--
-- Idempotente — seguro correr varias veces.
-- ============================================================

ALTER TABLE marketing_content_pieces
  DROP CONSTRAINT IF EXISTS marketing_content_pieces_status_check;
ALTER TABLE marketing_content_pieces
  ADD CONSTRAINT marketing_content_pieces_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'published'));

ALTER TABLE marketing_content_pieces ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE marketing_content_pieces ADD COLUMN IF NOT EXISTS compliance_checklist text[];

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS marketing_executive_id uuid REFERENCES platform_admins(user_id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- marketing_content_comments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_content_comments (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id       uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  piece_id         uuid NOT NULL REFERENCES marketing_content_pieces(id) ON DELETE CASCADE,
  author_type      text NOT NULL CHECK (author_type IN ('clinic', 'staff')),
  author_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name      text NOT NULL,
  body             text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_content_comments_piece
  ON marketing_content_comments(piece_id, created_at);

ALTER TABLE marketing_content_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_content_comments_select ON marketing_content_comments;
CREATE POLICY marketing_content_comments_select ON marketing_content_comments FOR SELECT
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS marketing_content_comments_insert ON marketing_content_comments;
CREATE POLICY marketing_content_comments_insert ON marketing_content_comments FOR INSERT
  WITH CHECK (
    is_account_member(account_id, 'agent')
    AND author_type = 'clinic'
    AND author_user_id = auth.uid()
  );

-- Deliberadamente sin policy de UPDATE/DELETE — ver header comment.
