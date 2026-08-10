-- =========================================================
-- 05_grants.sql
-- Permisos por rol sobre el schema `api`: qué tabla/operación
-- puede tocar cada rol ("permiso de superficie"). El filtrado
-- por fila (qué ticket ve cada quién) lo hace RLS en
-- 06_rls_policies.sql — ambos capas son necesarias.
-- =========================================================

GRANT USAGE ON SCHEMA api TO web_anon, admin, agente, cliente;

-- Los roles autenticados necesitan usar las secuencias de los
-- SERIAL para poder hacer INSERT vía PostgREST.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA api TO admin, agente, cliente;

-- ---- usuarios ----
GRANT SELECT, INSERT, UPDATE, DELETE ON api.usuarios TO admin;
GRANT SELECT, UPDATE ON api.usuarios TO agente;
GRANT SELECT, UPDATE ON api.usuarios TO cliente;

-- ---- catálogos: categorias / prioridades / estados ----
GRANT SELECT, INSERT, UPDATE, DELETE ON api.categorias  TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.prioridades TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.estados     TO admin;

GRANT SELECT ON api.categorias  TO agente, cliente;
GRANT SELECT ON api.prioridades TO agente, cliente;
GRANT SELECT ON api.estados     TO agente, cliente;

-- ---- tickets ----
GRANT SELECT, INSERT, UPDATE, DELETE ON api.tickets TO admin;
GRANT SELECT, INSERT, UPDATE ON api.tickets TO agente;
GRANT SELECT, INSERT ON api.tickets TO cliente;

-- ---- comentarios ----
GRANT SELECT, INSERT, UPDATE, DELETE ON api.comentarios TO admin;
GRANT SELECT, INSERT ON api.comentarios TO agente;
GRANT SELECT, INSERT ON api.comentarios TO cliente;

-- ---- adjuntos ----
GRANT SELECT, INSERT, UPDATE, DELETE ON api.adjuntos TO admin;
GRANT SELECT, INSERT ON api.adjuntos TO agente;
GRANT SELECT, INSERT ON api.adjuntos TO cliente;

-- ---- historial_tickets ----
-- Sin INSERT/UPDATE/DELETE para ningún rol de la API: se llena
-- únicamente por el trigger SECURITY DEFINER (03_functions_triggers.sql).
GRANT SELECT ON api.historial_tickets TO admin, agente, cliente;
