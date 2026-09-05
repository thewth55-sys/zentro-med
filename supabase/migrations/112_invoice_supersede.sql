-- "Agrupar facturas" — cuando un paciente ya tiene una factura vieja
-- sin pagar y se le crea una nueva, el staff puede arrastrar el saldo
-- pendiente de la vieja como una línea más de la nueva, en vez de
-- dejarle dos documentos sueltos por cobrar.
--
-- Deliberadamente NO se mueven las filas de `payments` ya registradas
-- contra la factura vieja, ni se reescribe su total — eso perdería
-- su propio historial/PDF tal como quedó. En vez de eso, la factura
-- vieja se marca `void` (ya no se espera cobrar sobre ella
-- directamente) y queda enlazada a la nueva vía
-- `superseded_by_invoice_id`, para que su propia vista siga
-- explicando "esto se agrupó en INV/2026/00025" en vez de aparecer
-- como una factura anulada sin motivo.
--
-- Idempotente — segura de correr más de una vez.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS superseded_by_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_superseded_by
  ON invoices(superseded_by_invoice_id)
  WHERE superseded_by_invoice_id IS NOT NULL;
