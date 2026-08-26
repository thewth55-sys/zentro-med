-- ============================================================
-- 091_business_hours_per_room.sql
--
-- Horario de la clínica POR CONSULTORIO (ubicación) + zona horaria de la
-- cuenta + disponibilidad de médicos gestionable por staff.
--
-- (C) `business_hours` define las horas y días de servicio de CADA
--     consultorio (rooms). Un cliente puede tener varios consultorios,
--     cada uno con su dirección y su propio horario. Se usan como base de
--     disponibilidad en la reserva pública: si un médico no tiene bloques
--     declarados ese día, se ofrecen slots dentro del horario del
--     consultorio; si sí los tiene, se intersectan con él.
--     Se agrega `accounts.timezone` para interpretar esas horas locales.
--
-- (A) Se amplía la RLS de `doctor_availability_blocks` para que agente+
--     (agente/admin/owner) pueda crear/editar/borrar los bloques de
--     CUALQUIER médico de la cuenta (antes solo el propio médico dueño).
--
-- Idempotente.
-- ============================================================

-- (C) Zona horaria de la cuenta (para interpretar business_hours locales).
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Mexico_City';

-- (C) Horas de servicio por consultorio. weekday: 0=domingo … 6=sábado
-- (igual que EXTRACT(DOW) de Postgres y getDay() de JS). Se permiten
-- varias filas por día (turnos partidos, ej. mañana y tarde). La ausencia
-- de filas para un consultorio/día = cerrado ese día.
CREATE TABLE IF NOT EXISTS business_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  room_id     uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  open_time   time NOT NULL,
  close_time  time NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (close_time > open_time)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_room ON business_hours(account_id, room_id, weekday);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_hours_select ON business_hours;
CREATE POLICY business_hours_select ON business_hours FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS business_hours_modify ON business_hours;
CREATE POLICY business_hours_modify ON business_hours FOR ALL
  USING (is_account_member(account_id, 'admin'))
  WITH CHECK (is_account_member(account_id, 'admin'));

-- ------------------------------------------------------------
-- (A) Disponibilidad de médicos gestionable por staff (agente+), no solo
-- por el médico dueño del bloque — el asistente que agenda necesita poder
-- declarar/editar la disponibilidad de cualquier médico.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS doctor_availability_blocks_insert ON doctor_availability_blocks;
CREATE POLICY doctor_availability_blocks_insert ON doctor_availability_blocks FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS doctor_availability_blocks_update ON doctor_availability_blocks;
CREATE POLICY doctor_availability_blocks_update ON doctor_availability_blocks FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS doctor_availability_blocks_delete ON doctor_availability_blocks;
CREATE POLICY doctor_availability_blocks_delete ON doctor_availability_blocks FOR DELETE
  USING (is_account_member(account_id, 'agent'));
