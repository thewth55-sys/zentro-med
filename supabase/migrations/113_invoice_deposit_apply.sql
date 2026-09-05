-- "Anticipo aplicado" — cuando un anticipo de reserva en línea
-- (appointment_deposits → markDepositPaid) ya generó su propia
-- factura pagada por separado (comportamiento existente, migración
-- 107), y luego se emite la factura real del tratamiento para esa
-- misma cita, el anticipo debe restarse del total en vez de quedar
-- como dos cobros sueltos sin relación visible.
--
-- `is_deposit_invoice` marca de forma explícita qué facturas nacieron
-- así (en vez de inferirlo por texto de `notes`, frágil). Se pone en
-- `mark-deposit-paid.ts`, el único lugar que ya crea estas facturas.
--
-- `applied_to_invoice_id` evita aplicar el mismo anticipo dos veces —
-- una vez que se usa en una factura, deja de aparecer como disponible.
--
-- Idempotente — segura de correr más de una vez.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS is_deposit_invoice boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applied_to_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_applied_to
  ON invoices(applied_to_invoice_id)
  WHERE applied_to_invoice_id IS NOT NULL;
