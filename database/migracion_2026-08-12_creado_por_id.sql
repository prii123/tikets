-- =========================================================
-- migracion_2026-08-12_creado_por_id.sql
-- Migración de UNA SOLA VEZ para bases de datos que ya estaban
-- corriendo antes de este cambio. NO se ejecuta automáticamente
-- (no vive en docker-entrypoint-initdb.d, esos scripts solo corren en
-- un volumen vacío) — hay que aplicarla a mano contra la base real.
--
-- NO borra datos: agrega la columna, la rellena para los tickets que
-- ya existen (se asume que el dueño del ticket fue quien lo creó, ya
-- que antes de este cambio no había forma de distinguirlo) y ajusta
-- las políticas RLS de INSERT en tickets.
--
-- 01_schema.sql y 06_rls_policies.sql ya quedaron actualizados para
-- que una instalación NUEVA desde cero no necesite este archivo.
-- =========================================================

BEGIN;

ALTER TABLE api.tickets ADD COLUMN IF NOT EXISTS creado_por_id INT REFERENCES api.usuarios(id);

UPDATE api.tickets SET creado_por_id = usuario_id WHERE creado_por_id IS NULL;

ALTER TABLE api.tickets ALTER COLUMN creado_por_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_creado_por_id ON api.tickets(creado_por_id);

ALTER POLICY tickets_agente_insert ON api.tickets
    WITH CHECK (creado_por_id = api.current_usuario_id());

ALTER POLICY tickets_cliente_insert_propio ON api.tickets
    WITH CHECK (usuario_id = api.current_usuario_id() AND creado_por_id = api.current_usuario_id());

COMMIT;

-- Hace que PostgREST recargue su caché de esquema (ya detecta la
-- columna/FK nueva) sin necesidad de reiniciar el contenedor.
NOTIFY pgrst, 'reload schema';
