-- ============================================================
-- 082_platform_announcements.sql
--
-- Platform-admin-controlled promotions/announcements, shown as a
-- carousel on every account's dashboard (/admin/announcements to
-- manage). Unlike discount_coupons (063), which mirrors a Stripe
-- object and is only ever read by platform admins, announcements
-- are pure local content that every logged-in account member must
-- be able to read — so this table gets its own SELECT policy open
-- to any authenticated user, scoped to "currently live" rows only.
-- Writes still go exclusively through the service-role client from
-- /api/platform-admin/announcements, same as coupons.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_announcements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  image_url   TEXT,
  link_url    TEXT,
  link_label  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_live
  ON platform_announcements(is_active, sort_order);

ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- Any authenticated account user can read a currently-live
-- announcement — this is what the dashboard carousel queries with
-- the regular (RLS-bound) client. Admin CRUD reads/writes via
-- supabaseAdmin() and so sees every row regardless of this policy.
DROP POLICY IF EXISTS platform_announcements_select ON platform_announcements;
CREATE POLICY platform_announcements_select ON platform_announcements FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

DROP TRIGGER IF EXISTS set_updated_at ON platform_announcements;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON platform_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
