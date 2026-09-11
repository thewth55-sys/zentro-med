-- ============================================================
-- 128_drop_legacy_set_member_role.sql — remove the now-superseded
-- 2-argument set_member_role overload.
--
-- Migration 127 added a 3-argument set_member_role(uuid,
-- account_role_enum, uuid DEFAULT NULL) via CREATE OR REPLACE —
-- since Postgres treats a different parameter LIST as a distinct
-- overload (not a replacement), the original 018 2-argument
-- function was left behind, dead. The only real call site
-- (src/app/api/account/members/[userId]/route.ts) always passes
-- all 3 named arguments, so this hasn't caused ambiguity in
-- practice — but leaving a dead overload around invites exactly
-- that bug for the next call site added without knowing about the
-- 3-arg version (a 2-key RPC call would silently resolve to the
-- old function and skip all custom_role_id handling). Drop it.
-- ============================================================

DROP FUNCTION IF EXISTS public.set_member_role(UUID, account_role_enum);
