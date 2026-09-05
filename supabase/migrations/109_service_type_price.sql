-- Precio por tratamiento — la página de reserva pública quiere mostrar
-- el precio junto a cada tratamiento (rediseño "Página de reserva"),
-- y service_types no tenía ninguna columna de precio hasta ahora
-- (ya señalado como pendiente en el comentario de 102_payment_gateways.sql).
-- Nullable: un tratamiento sin precio cargado simplemente no muestra
-- precio en la página pública, en vez de forzar a rellenar todos antes
-- de poder usar la función.

ALTER TABLE service_types ADD COLUMN IF NOT EXISTS price numeric(10, 2);
