-- ============================================================
-- 147_platform_staff_roles.sql — granular roles for internal Zentro
-- Labs staff (`platform_admins`), starting with just enough to gate
-- the Marketing content-approval admin panel.
--
-- Design notes
--   - `role` defaults every EXISTING platform admin to 'global' —
--     preserves today's behavior (all current staff have full
--     access) instead of silently locking anyone out. New staff
--     invited going forward can be given a narrower role.
--   - 6 possible values from day one (global/support/dev/qa/
--     customer_success/marketing) so this column never needs a
--     second migration when the other roles get real permission
--     logic — only 'marketing' (+ 'global', which always bypasses)
--     is actually enforced anywhere right now.
--   - Deliberately a single column on the existing table, not a
--     separate roles/permissions table — there is exactly one role
--     per staff member in this design, not many-to-many.
--
-- Idempotente — seguro correr varias veces.
-- ============================================================

ALTER TABLE platform_admins
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'global';

ALTER TABLE platform_admins
  DROP CONSTRAINT IF EXISTS platform_admins_role_check;
ALTER TABLE platform_admins
  ADD CONSTRAINT platform_admins_role_check
    CHECK (role IN ('global', 'support', 'dev', 'qa', 'customer_success', 'marketing'));
