-- ============================================================
-- 105_odontogram_quote_link.sql — "odontograma accionable": una vez
-- que un hallazgo dental se manda a un presupuesto, la línea de
-- cotización guarda de qué diente vino, sin ligar ningún dato de
-- precio/tratamiento al hallazgo clínico en sí (odontogram_teeth
-- sigue siendo puramente clínico — condición + notas + código ICD).
--
-- Mismo patrón que la migración 077
-- (link_documents_to_appointments): FK nullable + ON DELETE SET NULL,
-- sin RLS nueva — las políticas ya existentes de quote_items (agent+
-- para account_id) ya cubren esta columna.
--
-- Idempotente — segura de correr más de una vez.
-- ============================================================

ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS odontogram_tooth_id uuid REFERENCES odontogram_teeth(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quote_items_odontogram_tooth
  ON quote_items(odontogram_tooth_id)
  WHERE odontogram_tooth_id IS NOT NULL;
