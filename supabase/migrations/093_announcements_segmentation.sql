-- ============================================================
-- 093_announcements_segmentation.sql — segmentación + notificación para
-- los avisos de plataforma (mejora sobre 082).
--
--   - `audience`: 'all' (todos), 'accounts' (clínicas específicas) o
--     'users' (usuarios específicos), con la tabla announcement_targets.
--   - `send_notification`: si es true, al publicar se inserta además una
--     fila en `notifications` para cada destinatario → campana in-app + push.
--
-- Escrituras solo por service-role (/api/platform-admin/announcements).
-- Lectura por cualquier usuario autenticado que sea destinatario.
--
-- Idempotente.
-- ============================================================

ALTER TABLE platform_announcements
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all', 'accounts', 'users'));
ALTER TABLE platform_announcements
  ADD COLUMN IF NOT EXISTS send_notification boolean NOT NULL DEFAULT false;

-- Destinatarios (cuando audience != 'all'). account_id → toda una clínica;
-- user_id → un usuario puntual.
CREATE TABLE IF NOT EXISTS announcement_targets (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id uuid NOT NULL REFERENCES platform_announcements(id) ON DELETE CASCADE,
  account_id      uuid REFERENCES accounts(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_targets_ann ON announcement_targets(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_targets_user ON announcement_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_targets_account ON announcement_targets(account_id);

-- ¿El aviso `ann_id` es visible para el usuario actual? SECURITY DEFINER
-- para poder mirar announcement_targets sin exponerlo por RLS.
CREATE OR REPLACE FUNCTION public.announcement_visible_to_me(ann_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM announcement_targets t
    WHERE t.announcement_id = ann_id
      AND (
        t.user_id = auth.uid()
        OR t.account_id = (SELECT account_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
      )
  );
$$;

ALTER TABLE announcement_targets ENABLE ROW LEVEL SECURITY; -- solo service-role / la función definer

-- La lectura ahora respeta la segmentación: 'all' para todos, o ser destinatario.
DROP POLICY IF EXISTS platform_announcements_select ON platform_announcements;
CREATE POLICY platform_announcements_select ON platform_announcements FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
    AND (audience = 'all' OR public.announcement_visible_to_me(id))
  );

-- Permite el tipo 'announcement' en notifications (para publicar + notificar).
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('conversation_assigned', 'response_reminder', 'announcement'));
