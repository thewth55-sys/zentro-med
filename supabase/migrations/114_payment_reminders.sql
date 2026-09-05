-- ============================================================
-- 114_payment_reminders.sql — automatic WhatsApp payment reminders
-- via approved WABA templates (Settings → Recordatorios), same
-- pattern as 084_appointment_reminders.sql but for an unpaid
-- invoice instead of an upcoming appointment.
--
-- Design notes
--   - `payment_reminder_configs` mirrors `appointment_reminder_configs`
--     exactly (account-scoped, UNIQUE(account_id), off by default
--     until an approved template is picked) — no `hours_before`
--     though: the offsets are fixed at +7/+15 days from issue date
--     (matches the "Nueva factura" checkbox's own wording), not a
--     configurable single value.
--   - `payment_reminders` is scheduled directly by the app
--     (POST /api/billing/invoices, when the "recordar el pago"
--     checkbox is checked) rather than by a DB trigger — unlike
--     appointments, invoices are only ever CREATED from that one
--     route today, so there's no multi-writer problem to solve with
--     a trigger at insert time.
--   - What DOES need a trigger is CANCELING a pending reminder the
--     moment the invoice is settled — that can happen from several
--     places (a manual "Registrar pago", a checkout-link webhook, a
--     deposit application), all of which already converge on
--     `invoices.status` flipping via the existing
--     `recompute_invoice_amount_paid` trigger or a direct update
--     (void/merge). Same reasoning as 084's own trigger: one choke
--     point common to every writer beats teaching every payment path
--     about reminders individually.
--
-- RLS
--   `payment_reminder_configs`: any member reads, admin+ writes.
--   `payment_reminders`: any member reads; INSERT is agent+ (the
--   "Nueva factura" route runs as the requesting staff member, not
--   service-role, unlike appointment_reminders which is
--   trigger-only) — UPDATE/cancel happens via the SECURITY DEFINER
--   trigger or the cron's service-role client, so no UPDATE policy
--   is needed for regular roles.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_reminder_configs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  is_active         boolean NOT NULL DEFAULT false,
  template_name     text,
  template_language text,
  -- Record<string /* "{{N}}" number */, { type: 'static'; value: string }
  --                                    | { type: 'token'; value: PaymentReminderVariableToken }>
  variable_mapping  jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_reminder_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_reminder_configs_select ON payment_reminder_configs;
CREATE POLICY payment_reminder_configs_select ON payment_reminder_configs FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS payment_reminder_configs_insert ON payment_reminder_configs;
CREATE POLICY payment_reminder_configs_insert ON payment_reminder_configs FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS payment_reminder_configs_update ON payment_reminder_configs;
CREATE POLICY payment_reminder_configs_update ON payment_reminder_configs FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS payment_reminder_configs_delete ON payment_reminder_configs;
CREATE POLICY payment_reminder_configs_delete ON payment_reminder_configs FOR DELETE
  USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON payment_reminder_configs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payment_reminder_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- payment_reminders — schedule/log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_reminders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  invoice_id     uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  send_at        timestamptz NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  error_message  text,
  sent_at        timestamptz,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_due
  ON payment_reminders(send_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice
  ON payment_reminders(invoice_id) WHERE status = 'pending';

ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_reminders_select ON payment_reminders;
CREATE POLICY payment_reminders_select ON payment_reminders FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS payment_reminders_insert ON payment_reminders;
CREATE POLICY payment_reminders_insert ON payment_reminders FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON payment_reminders;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payment_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- Trigger: cancel pending reminders once the invoice settles
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_payment_reminders_on_settle()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('paid', 'void') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE payment_reminders
      SET status = 'cancelled'
      WHERE invoice_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS invoices_cancel_payment_reminders ON invoices;
CREATE TRIGGER invoices_cancel_payment_reminders
  AFTER UPDATE OF status ON invoices
  FOR EACH ROW EXECUTE FUNCTION cancel_payment_reminders_on_settle();
