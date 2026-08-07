-- ============================================================
-- 087_login_events_impersonation_flag.sql — distinguishes a real
-- customer login from the session created when a platform admin
-- clicks "Impersonar" (which fires the exact same client-side
-- SIGNED_IN → log-session flow, in the admin's own browser, since
-- impersonation swaps the browser's session to the customer's user).
-- Without this, an admin poking around a dormant account for support
-- makes it look freshly active in the /admin "última actividad" view.
--
-- The flag is set client-side (see account-actions-menu.tsx stamping
-- sessionStorage right before the post-impersonate redirect, read by
-- use-auth.tsx's SIGNED_IN handler and forwarded to
-- POST /api/auth/log-session) — trusted from the client because it's
-- purely an analytics label with no privilege implication; the real
-- security-relevant impersonation audit trail is
-- platform_admin_audit_log (041), written server-side and untouched
-- by this column.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE login_events
  ADD COLUMN IF NOT EXISTS is_impersonation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_login_events_account_real
  ON login_events(account_id, created_at DESC) WHERE is_impersonation = false;
