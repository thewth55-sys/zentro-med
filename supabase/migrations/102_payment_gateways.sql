-- ============================================================
-- 102_payment_gateways.sql — provider-agnostic payment gateway for
-- collecting a deposit ("anticipo") at public-booking time.
--
-- Design notes
--   - Multi-provider by design, not just Clip: clients span several
--     countries and the available gateway differs by market (Stripe
--     is close to universal, Mercado Pago dominates several LatAm
--     countries, Clip is Mexico-specific but what the first real
--     customer already uses). `payment_gateway_configs.provider`
--     picks ONE active gateway per account; `src/lib/payments/`
--     dispatches to the matching adapter, each implementing the same
--     `createCheckout()` contract so the booking route and the
--     settings UI don't need to know which provider is behind it.
--   - `credentials` is a single AES-256-GCM-encrypted JSON blob (same
--     `encrypt()`/`decrypt()` as `ai_configs.api_key` /
--     `whatsapp_config.access_token`), not per-field columns — each
--     provider's own credential shape differs (Stripe: secret key +
--     webhook signing secret; Mercado Pago: access token; Clip: API
--     key + secret key, combined into HTTP Basic Auth per their own
--     docs), and a JSON blob avoids a wide table of
--     mostly-null provider-specific columns. Never round-tripped to
--     the client in plaintext — same posture as every other BYO-key
--     config in this schema.
--   - Deposit amount is a single fixed value per account (not
--     per-service): `service_types` has no price column today, so
--     "% of the service price" isn't computable yet. A flat amount
--     covers the actual ask ("anticipo de la consulta"); per-service
--     pricing is a natural follow-up if/when `service_types` gains a
--     price.
--   - `appointment_deposits` is the checkout/payment log, one row per
--     deposit attempt. `external_reference` is OUR OWN id, generated
--     before calling the provider and passed as their
--     metadata/external_reference field — the one thing guaranteed
--     to come back on every provider's webhook, so the webhook
--     handler can always find the right row even if the provider's
--     own checkout/session id isn't echoed consistently.
--   - No RLS write policies on `appointment_deposits` for
--     authenticated roles — every write happens server-side (the
--     public booking route and the three webhook routes), all via
--     the service-role client, same posture as `billing_counters` /
--     `login_2fa_challenges`.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_gateway_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider        text NOT NULL CHECK (provider IN ('stripe', 'mercadopago', 'clip')),
  is_active       boolean NOT NULL DEFAULT false,
  credentials     text NOT NULL,               -- AES-256-GCM-encrypted JSON, shape per provider
  deposit_amount  numeric(12,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  currency        text NOT NULL DEFAULT 'MXN',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_gateway_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_gateway_configs_select ON payment_gateway_configs;
CREATE POLICY payment_gateway_configs_select ON payment_gateway_configs FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS payment_gateway_configs_insert ON payment_gateway_configs;
CREATE POLICY payment_gateway_configs_insert ON payment_gateway_configs FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS payment_gateway_configs_update ON payment_gateway_configs;
CREATE POLICY payment_gateway_configs_update ON payment_gateway_configs FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS payment_gateway_configs_delete ON payment_gateway_configs;
CREATE POLICY payment_gateway_configs_delete ON payment_gateway_configs FOR DELETE
  USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON payment_gateway_configs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payment_gateway_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- appointment_deposits — checkout/payment log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_deposits (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  appointment_id        uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  provider              text NOT NULL CHECK (provider IN ('stripe', 'mercadopago', 'clip')),
  external_reference    uuid NOT NULL DEFAULT gen_random_uuid(),
  external_checkout_id  text,
  checkout_url          text,
  amount                numeric(12,2) NOT NULL CHECK (amount > 0),
  currency              text NOT NULL,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'canceled')),
  paid_at               timestamptz,
  raw_webhook           jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_deposits_external_reference
  ON appointment_deposits(external_reference);
CREATE INDEX IF NOT EXISTS idx_appointment_deposits_appointment
  ON appointment_deposits(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_deposits_account
  ON appointment_deposits(account_id);

ALTER TABLE appointment_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointment_deposits_select ON appointment_deposits;
CREATE POLICY appointment_deposits_select ON appointment_deposits FOR SELECT
  USING (is_account_member(account_id));

-- No INSERT/UPDATE/DELETE policy for authenticated roles — every write
-- (booking route, three provider webhooks) goes through the
-- service-role client.

DROP TRIGGER IF EXISTS set_updated_at ON appointment_deposits;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON appointment_deposits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
