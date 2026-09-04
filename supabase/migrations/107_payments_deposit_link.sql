-- ============================================================
-- 107_payments_deposit_link.sql — links a `payments` row back to the
-- `appointment_deposits` row it came from, so a deposit collected
-- through the public booking widget (Stripe/Mercado Pago/Clip) leaves
-- a real, structured accounting trail instead of nothing at all.
--
-- Before this, a paid deposit only ever updated `appointment_deposits`
-- itself — no `invoices`/`payments` row was created, so the clinic had
-- no record inside Zentro Med that money was collected (only the
-- payment gateway's own dashboard knew). The webhook handler
-- (src/lib/payments/webhook-handler.ts) now also creates an invoice +
-- payment for the deposit amount when a payment is confirmed; this
-- FK is what ties that payment back to the original gateway
-- transaction (provider, external_reference, external_checkout_id,
-- raw_webhook payload) without duplicating any of those fields onto
-- `payments` itself.
--
-- Nullable + ON DELETE SET NULL, same as every other "where did this
-- come from" link in this schema (105, 106) — a payment stays valid
-- accounting history even if the deposit row it originated from is
-- ever removed.
--
-- Idempotente — segura de correr más de una vez.
-- ============================================================

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS appointment_deposit_id uuid REFERENCES appointment_deposits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_appointment_deposit
  ON payments(appointment_deposit_id)
  WHERE appointment_deposit_id IS NOT NULL;
