-- ============================================================
-- 103_payment_gateway_booking_terms.sql — free-text "reservation
-- terms" the clinic itself writes (Ajustes → Agenda → Pasarela de
-- pago), shown to the patient on the public booking page next to the
-- deposit explanation, right before they're redirected to pay.
-- Same "clinic writes its own text, Zentro Med just stores/renders
-- it" shape as accounts.quote_terms (043_account_branding.sql) for
-- invoice PDFs — no separate legal-content feature, just a field.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE payment_gateway_configs
  ADD COLUMN IF NOT EXISTS booking_terms text;
