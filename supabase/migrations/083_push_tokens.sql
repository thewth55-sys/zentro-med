-- ============================================================
-- 083_push_tokens.sql — device push tokens for the Android app
-- (Capacitor + Firebase Cloud Messaging).
--
-- This is deliberately separate from the existing web-only
-- `notification-alerts.tsx` flow (browser Notification API, only
-- fires while a tab is open): FCM tokens let the SERVER push a
-- notification even when the app is fully closed / phone locked.
-- One row per (user, token) — the same physical device
-- re-registering (app reopen, FCM token refresh) upserts in place
-- rather than accumulating duplicates. A user can have several rows
-- (multiple devices); a token is unregistered by deleting its row
-- (e.g. on logout), never by clearing account_id/user_id.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_user_token ON push_tokens(user_id, token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Own-rows-only — a device token is meaningless to anyone but its
-- owner and whatever server-side job sends the push (which uses the
-- service-role client and so bypasses RLS entirely).
DROP POLICY IF EXISTS push_tokens_select ON push_tokens;
CREATE POLICY push_tokens_select ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS push_tokens_insert ON push_tokens;
CREATE POLICY push_tokens_insert ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_tokens_update ON push_tokens;
CREATE POLICY push_tokens_update ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_tokens_delete ON push_tokens;
CREATE POLICY push_tokens_delete ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_updated_at ON push_tokens;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
