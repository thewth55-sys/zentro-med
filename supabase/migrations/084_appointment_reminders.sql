-- ============================================================
-- 084_appointment_reminders.sql — Automatic WhatsApp appointment
-- reminders via approved WABA templates (Settings → Reminders)
--
-- Design notes
--   - `appointment_reminder_configs` is account-scoped and
--     UNIQUE(account_id) — one config per workspace, same shape as
--     `conversion_tracking_config` / `ai_configs`. Off by default
--     (`is_active = false`) until the account picks an approved
--     template.
--   - `variable_mapping` maps a template's `{{N}}` body placeholders
--     (keyed by the placeholder number as text, e.g. "1") to either a
--     literal string or one of a fixed set of reminder tokens
--     (contact_name, appointment_date, appointment_time, doctor_name,
--     service_name, account_name) — resolved server-side in the cron
--     handler, never trusted from the client beyond the token enum.
--   - `appointment_reminders` is the per-appointment schedule/log —
--     one row per upcoming reminder attempt, drained by a cron sweep
--     mirroring `automation_pending_executions` +
--     `src/app/api/automations/cron/route.ts`'s claim-then-process
--     pattern, but with its own simpler status machine (this isn't a
--     multi-step automation run, just "send this template at this
--     time").
--   - Scheduling is driven by a trigger on `appointments` rather than
--     from application code, because appointments are written from
--     four independent places (the two dashboard CRUD routes, the
--     Cal.com webhook, and the public self-serve booking route) — a
--     DB trigger is the one choke point common to all of them, same
--     reasoning as the existing `set_updated_at` triggers.
--   - The trigger only fires on columns that actually affect whether
--     a reminder is owed (`start_at`, `status`, `contact_id`) so a
--     plain notes edit doesn't touch the schedule. It reads the
--     account's current `hours_before` at insert/update time — if the
--     setting changes later, already-scheduled reminders keep their
--     original offset (acceptable: reminders are short-lived, this
--     avoids a second recompute pass). SECURITY DEFINER because the
--     appointment writer (an 'agent' role) doesn't otherwise have
--     INSERT/UPDATE rights on `appointment_reminders`.
--
-- RLS
--   `appointment_reminder_configs`: any member reads, admin+ writes —
--   identical shape to `conversion_tracking_config`.
--   `appointment_reminders`: any member reads (so a future "reminder
--   sent" indicator can show in the appointment/patient view); all
--   writes happen through the SECURITY DEFINER trigger or the cron's
--   service-role client, so no INSERT/UPDATE/DELETE policy is needed
--   for regular roles.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS appointment_reminder_configs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  is_active         boolean NOT NULL DEFAULT false,
  hours_before      integer NOT NULL DEFAULT 24 CHECK (hours_before > 0 AND hours_before <= 336),
  template_name     text,
  template_language text,
  -- Record<string /* "{{N}}" number */, { type: 'static'; value: string }
  --                                    | { type: 'token'; value: ReminderVariableToken }>
  variable_mapping  jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE appointment_reminder_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointment_reminder_configs_select ON appointment_reminder_configs;
CREATE POLICY appointment_reminder_configs_select ON appointment_reminder_configs FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS appointment_reminder_configs_insert ON appointment_reminder_configs;
CREATE POLICY appointment_reminder_configs_insert ON appointment_reminder_configs FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS appointment_reminder_configs_update ON appointment_reminder_configs;
CREATE POLICY appointment_reminder_configs_update ON appointment_reminder_configs FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS appointment_reminder_configs_delete ON appointment_reminder_configs;
CREATE POLICY appointment_reminder_configs_delete ON appointment_reminder_configs FOR DELETE
  USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON appointment_reminder_configs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON appointment_reminder_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- appointment_reminders — schedule/log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

  send_at        timestamptz NOT NULL,
  -- 'processing' is a short-lived claim marker (see the cron route's
  -- claim-then-process step) so overlapping cron invocations can't
  -- double-send the same reminder.
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  error_message  text,
  sent_at        timestamptz,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Only one live (pending) reminder per appointment at a time — the
-- trigger updates this row in place on reschedule instead of piling
-- up duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_reminders_one_pending
  ON appointment_reminders(appointment_id) WHERE status = 'pending';
-- Cron sweep: due, pending reminders ordered by fire time.
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_due
  ON appointment_reminders(send_at) WHERE status = 'pending';

ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointment_reminders_select ON appointment_reminders;
CREATE POLICY appointment_reminders_select ON appointment_reminders FOR SELECT
  USING (is_account_member(account_id));

DROP TRIGGER IF EXISTS set_updated_at ON appointment_reminders;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON appointment_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- Trigger: keep appointment_reminders in sync with appointments
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION schedule_appointment_reminder()
RETURNS TRIGGER AS $$
DECLARE
  cfg RECORD;
  target_send_at timestamptz;
BEGIN
  -- No longer eligible (no contact to message, or the appointment
  -- won't happen) — drop any live reminder and stop.
  IF NEW.contact_id IS NULL OR NEW.status IN ('cancelled', 'no_show', 'completed') THEN
    UPDATE appointment_reminders
      SET status = 'cancelled'
      WHERE appointment_id = NEW.id AND status = 'pending';
    RETURN NEW;
  END IF;

  SELECT * INTO cfg FROM appointment_reminder_configs
    WHERE account_id = NEW.account_id
      AND is_active = true
      AND template_name IS NOT NULL
      AND template_language IS NOT NULL;

  IF NOT FOUND THEN
    -- Reminders off (or never configured) for this account.
    UPDATE appointment_reminders
      SET status = 'cancelled'
      WHERE appointment_id = NEW.id AND status = 'pending';
    RETURN NEW;
  END IF;

  target_send_at := NEW.start_at - (cfg.hours_before * interval '1 hour');

  IF target_send_at <= now() THEN
    -- Already inside (or past) the reminder window — nothing
    -- meaningful to schedule.
    UPDATE appointment_reminders
      SET status = 'cancelled'
      WHERE appointment_id = NEW.id AND status = 'pending';
    RETURN NEW;
  END IF;

  UPDATE appointment_reminders
    SET send_at = target_send_at
    WHERE appointment_id = NEW.id AND status = 'pending';

  IF NOT FOUND THEN
    INSERT INTO appointment_reminders (account_id, appointment_id, send_at, status)
    VALUES (NEW.account_id, NEW.id, target_send_at, 'pending');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS appointments_schedule_reminder ON appointments;
CREATE TRIGGER appointments_schedule_reminder
  AFTER INSERT OR UPDATE OF start_at, status, contact_id ON appointments
  FOR EACH ROW EXECUTE FUNCTION schedule_appointment_reminder();
