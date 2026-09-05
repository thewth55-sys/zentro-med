-- "Nueva factura" quiere poder traer líneas específicas del plan de
-- tratamiento (cotización aceptada) y conservar de qué diente/fase
-- vinieron — igual que ya hace quote_items (105/106), pero
-- invoice_items no tenía ninguna de las tres columnas.
--
-- `phase_label` es texto plano (snapshot), no un FK a quote_phases:
-- una factura puede seguir existiendo mucho después de que la
-- cotización que la originó cambie de fases o se archive, así que no
-- tiene sentido atarla a una fila viva de otra tabla solo para un
-- rótulo informativo.
--
-- `source_quote_item_id` sí es un FK real — permite (a) evitar traer
-- la misma línea del plan dos veces a distintas facturas, y (b)
-- marcar `quote_items.completed = true` en el origen cuando la
-- factura se emite, sin inventar un segundo estado "hecho"
-- desincronizado del que ya usa la vista del plan de tratamiento.
--
-- Idempotente — segura de correr más de una vez.

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS odontogram_tooth_id uuid REFERENCES odontogram_teeth(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phase_label text,
  ADD COLUMN IF NOT EXISTS source_quote_item_id uuid REFERENCES quote_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_items_odontogram_tooth
  ON invoice_items(odontogram_tooth_id)
  WHERE odontogram_tooth_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_items_source_quote_item
  ON invoice_items(source_quote_item_id)
  WHERE source_quote_item_id IS NOT NULL;
