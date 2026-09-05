-- "Nueva factura" quiere poder generar un link de cobro real (Stripe/
-- Mercado Pago/Clip) para una factura normal, no solo para el
-- anticipo de la página pública de reserva (appointment_deposits,
-- 102_payment_gateways.sql). El adaptador de pagos
-- (src/lib/payments/gateway.ts) ya es genérico — createCheckout no
-- pide nada específico de citas — así que esta tabla es el mismo
-- patrón que appointment_deposits, pero apuntando a `invoices` en vez
-- de `appointments`.
--
-- `amount` se guarda al crear el checkout (saldo pendiente de la
-- factura en ese momento) porque WebhookConfirmation nunca trae un
-- monto confiable del proveedor — el webhook solo confirma "se pagó",
-- nunca cuánto había que cobrar; ese número lo definimos nosotros.
--
-- El webhook handler compartido (webhook-handler.ts) sigue intentando
-- primero appointment_deposits por external_reference (sin tocar ese
-- camino) y solo si no hay match prueba esta tabla — cero riesgo de
-- colisión, cada external_reference es su propio gen_random_uuid().
--
-- Idempotente — segura de correr más de una vez.

CREATE TABLE IF NOT EXISTS invoice_checkouts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  invoice_id            uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  provider              text NOT NULL CHECK (provider IN ('stripe', 'mercadopago', 'clip')),
  external_reference    uuid NOT NULL DEFAULT gen_random_uuid(),
  external_checkout_id  text,
  checkout_url          text,
  amount                numeric(12,2) NOT NULL CHECK (amount > 0),
  currency              text NOT NULL DEFAULT 'MXN',
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  raw_webhook           jsonb,
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_reference)
);

CREATE INDEX IF NOT EXISTS idx_invoice_checkouts_invoice ON invoice_checkouts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_checkouts_account ON invoice_checkouts(account_id);

ALTER TABLE invoice_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_checkouts_select ON invoice_checkouts;
CREATE POLICY invoice_checkouts_select ON invoice_checkouts FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS invoice_checkouts_insert ON invoice_checkouts;
CREATE POLICY invoice_checkouts_insert ON invoice_checkouts FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON invoice_checkouts;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON invoice_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- "Cómo va a pagar" elegido al emitir — puramente informativo (qué
-- espera el staff que pase), no dispara nada por sí solo salvo
-- 'link', que además crea una fila en invoice_checkouts.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_method_intent text
    CHECK (payment_method_intent IN ('link', 'cash', 'transfer', 'terminal'));
