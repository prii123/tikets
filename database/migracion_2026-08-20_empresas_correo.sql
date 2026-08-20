-- =========================================================
-- migracion_2026-08-20_empresas_correo.sql
-- Migración de UNA SOLA VEZ para bases de datos que ya estaban
-- corriendo antes de este cambio. NO se ejecuta automáticamente
-- (no vive en docker-entrypoint-initdb.d) — se aplica a mano contra
-- la base real. No borra datos.
--
-- 01_schema.sql ya quedó actualizado para que una instalación NUEVA
-- desde cero no necesite este archivo.
-- =========================================================

ALTER TABLE api.empresas ADD COLUMN IF NOT EXISTS correo VARCHAR(255);

NOTIFY pgrst, 'reload schema';
