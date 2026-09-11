-- ============================================================
-- 126_account_custom_roles.sql — tenant-defined "profiles" (custom
-- roles). A profile is a named bundle of a base `account_role`
-- (agent or viewer only — admin/owner stay fixed/full-trust, they
-- must always be able to manage the account) plus a per-section
-- visibility map. This is a refinement layer ON TOP of the existing
-- 4-tier role/RLS system, never a replacement — `profiles.account_role`
-- still holds the real, RLS-enforced role; `custom_role_id` is purely
-- an application-layer narrowing (nav hiding + view-only checks in
-- specific write routes, see requireSectionAccess).
--
-- `section_overrides` is jsonb (Partial<Record<SectionKey,
-- 'hidden'|'view_only'>>) rather than a normalized table — same
-- pattern accounts.feature_overrides already uses in this schema for
-- "small, stable, app-defined key -> value map, absent key = default."
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS account_roles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  base_role           account_role_enum NOT NULL CHECK (base_role IN ('agent', 'viewer')),
  section_overrides   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, name)
);

CREATE INDEX IF NOT EXISTS idx_account_roles_account ON account_roles(account_id);

ALTER TABLE account_roles ENABLE ROW LEVEL SECURITY;

-- Any member can read the account's profiles — every user needs to
-- resolve their OWN profile's section overrides, and the invite
-- dialog needs to list them for anyone with canManageMembers (already
-- admin+ at the route level, RLS here is deliberately looser since
-- reading a profile's name/permissions isn't sensitive).
DROP POLICY IF EXISTS account_roles_select ON account_roles;
CREATE POLICY account_roles_select ON account_roles FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS account_roles_insert ON account_roles;
CREATE POLICY account_roles_insert ON account_roles FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS account_roles_update ON account_roles;
CREATE POLICY account_roles_update ON account_roles FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS account_roles_delete ON account_roles;
CREATE POLICY account_roles_delete ON account_roles FOR DELETE
  USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON account_roles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON account_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Nullable — a member with no assigned profile just uses their plain
-- base account_role, unchanged from today. ON DELETE SET NULL: if a
-- profile is deleted, members holding it fall back to their base role
-- rather than the delete being blocked or the profile row orphaning
-- them into an invalid state.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES account_roles(id) ON DELETE SET NULL;

-- Not writable through the existing profiles_update RLS policy
-- (self-update only) — only ever set via set_member_role/
-- redeem_invitation (SECURITY DEFINER), which validate that the
-- profile's account_id and base_role actually match. See migration
-- 127.
