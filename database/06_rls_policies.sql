-- =========================================================
-- 06_rls_policies.sql
-- Row Level Security: define qué FILAS puede ver/tocar cada rol.
-- admin  -> acceso total.
-- agente -> tickets sin asignar o asignados a él/ella (y lo
--           relacionado a esos tickets: comentarios, adjuntos, historial);
--           también da de alta usuarios cliente.
-- cliente -> todos los tickets de SU EMPRESA (no solo los que él creó) y
--           lo relacionado a ellos; nunca ve comentarios/adjuntos internos;
--           no puede crear usuarios (no hay auto-registro).
-- =========================================================

-- ---------------------------------------------------------
-- empresas
-- ---------------------------------------------------------
ALTER TABLE api.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY empresas_admin_all ON api.empresas
    FOR ALL TO admin
    USING (true) WITH CHECK (true);

-- agente ve todas las empresas para poder elegir a cuál asociar un
-- usuario nuevo que esté creando.
CREATE POLICY empresas_agente_select ON api.empresas
    FOR SELECT TO agente
    USING (true);

-- cliente solo ve su propia empresa (no la lista completa de clientes).
CREATE POLICY empresas_cliente_select_propia ON api.empresas
    FOR SELECT TO cliente
    USING (id = api.current_empresa_id());

-- ---------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------
ALTER TABLE api.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_admin_all ON api.usuarios
    FOR ALL TO admin
    USING (true) WITH CHECK (true);

-- agente necesita ver el listado de usuarios para saber quién
-- reportó un ticket y a qué compañeros puede reasignar.
CREATE POLICY usuarios_agente_select ON api.usuarios
    FOR SELECT TO agente
    USING (true);

CREATE POLICY usuarios_agente_update_propio ON api.usuarios
    FOR UPDATE TO agente
    USING (id = api.current_usuario_id())
    WITH CHECK (id = api.current_usuario_id());

-- agente da de alta usuarios cliente (la cuenta en Cognito se crea
-- aparte, vía AdminCreateUser; esto solo inserta el espejo local).
-- Restringido a rol='cliente': un agente no puede crearse a sí mismo
-- ni a otros como admin/agente, eso queda reservado a admin (policy
-- usuarios_admin_all de arriba, sin restricción de rol).
CREATE POLICY usuarios_agente_insert_cliente ON api.usuarios
    FOR INSERT TO agente
    WITH CHECK (rol = 'cliente' AND empresa_id IS NOT NULL);

-- cliente ve a sus compañeros de la misma empresa (para saber quién
-- reportó cada ticket compartido), no solo su propia fila.
CREATE POLICY usuarios_cliente_select_empresa ON api.usuarios
    FOR SELECT TO cliente
    USING (empresa_id = api.current_empresa_id());

CREATE POLICY usuarios_cliente_update_propio ON api.usuarios
    FOR UPDATE TO cliente
    USING (id = api.current_usuario_id())
    WITH CHECK (id = api.current_usuario_id());

-- ---------------------------------------------------------
-- catálogos: categorias / prioridades / estados
-- Solo admin escribe; el resto únicamente lee (ya limitado por
-- GRANT), aquí solo se habilita RLS para permitir el SELECT.
-- ---------------------------------------------------------
ALTER TABLE api.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY categorias_admin_all ON api.categorias FOR ALL TO admin USING (true) WITH CHECK (true);
CREATE POLICY categorias_lectura ON api.categorias FOR SELECT TO agente, cliente USING (true);

ALTER TABLE api.prioridades ENABLE ROW LEVEL SECURITY;
CREATE POLICY prioridades_admin_all ON api.prioridades FOR ALL TO admin USING (true) WITH CHECK (true);
CREATE POLICY prioridades_lectura ON api.prioridades FOR SELECT TO agente, cliente USING (true);

ALTER TABLE api.estados ENABLE ROW LEVEL SECURITY;
CREATE POLICY estados_admin_all ON api.estados FOR ALL TO admin USING (true) WITH CHECK (true);
CREATE POLICY estados_lectura ON api.estados FOR SELECT TO agente, cliente USING (true);

-- ---------------------------------------------------------
-- tickets
-- ---------------------------------------------------------
ALTER TABLE api.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_admin_all ON api.tickets
    FOR ALL TO admin
    USING (true) WITH CHECK (true);

CREATE POLICY tickets_agente_select ON api.tickets
    FOR SELECT TO agente
    USING (asignado_a = api.current_usuario_id() OR asignado_a IS NULL);

-- WITH CHECK permisivo a propósito: permite que un agente tome un
-- ticket sin asignar, lo reasigne a otro agente, o cambie estado/
-- prioridad de los tickets que ya puede ver (USING).
CREATE POLICY tickets_agente_update ON api.tickets
    FOR UPDATE TO agente
    USING (asignado_a = api.current_usuario_id() OR asignado_a IS NULL)
    WITH CHECK (true);

CREATE POLICY tickets_agente_insert ON api.tickets
    FOR INSERT TO agente
    WITH CHECK (true);

-- cliente ve todos los tickets de SU EMPRESA, no solo los que él creó
-- (cualquier compañero de la misma empresa puede dar seguimiento).
CREATE POLICY tickets_cliente_select_empresa ON api.tickets
    FOR SELECT TO cliente
    USING (
        usuario_id IN (SELECT id FROM api.usuarios WHERE empresa_id = api.current_empresa_id())
    );

-- pero al crear un ticket, siempre queda a nombre de quien lo crea.
CREATE POLICY tickets_cliente_insert_propio ON api.tickets
    FOR INSERT TO cliente
    WITH CHECK (usuario_id = api.current_usuario_id());

-- ---------------------------------------------------------
-- comentarios
-- ---------------------------------------------------------
ALTER TABLE api.comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY comentarios_admin_all ON api.comentarios
    FOR ALL TO admin
    USING (true) WITH CHECK (true);

CREATE POLICY comentarios_agente_select ON api.comentarios
    FOR SELECT TO agente
    USING (
        EXISTS (
            SELECT 1 FROM api.tickets t
            WHERE t.id = comentarios.ticket_id
              AND (t.asignado_a = api.current_usuario_id() OR t.asignado_a IS NULL)
        )
    );

CREATE POLICY comentarios_agente_insert ON api.comentarios
    FOR INSERT TO agente
    WITH CHECK (
        usuario_id = api.current_usuario_id()
        AND EXISTS (
            SELECT 1 FROM api.tickets t
            WHERE t.id = comentarios.ticket_id
              AND (t.asignado_a = api.current_usuario_id() OR t.asignado_a IS NULL)
        )
    );

-- cliente nunca ve notas internas (es_interno = false obligatorio); ve
-- comentarios de cualquier ticket de SU EMPRESA, no solo los propios.
CREATE POLICY comentarios_cliente_select ON api.comentarios
    FOR SELECT TO cliente
    USING (
        es_interno = false
        AND EXISTS (
            SELECT 1 FROM api.tickets t
            WHERE t.id = comentarios.ticket_id
              AND t.usuario_id IN (SELECT id FROM api.usuarios WHERE empresa_id = api.current_empresa_id())
        )
    );

CREATE POLICY comentarios_cliente_insert ON api.comentarios
    FOR INSERT TO cliente
    WITH CHECK (
        usuario_id = api.current_usuario_id()
        AND es_interno = false
        AND EXISTS (
            SELECT 1 FROM api.tickets t
            WHERE t.id = comentarios.ticket_id
              AND t.usuario_id IN (SELECT id FROM api.usuarios WHERE empresa_id = api.current_empresa_id())
        )
    );

-- ---------------------------------------------------------
-- adjuntos
-- ---------------------------------------------------------
ALTER TABLE api.adjuntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY adjuntos_admin_all ON api.adjuntos
    FOR ALL TO admin
    USING (true) WITH CHECK (true);

CREATE POLICY adjuntos_agente_select ON api.adjuntos
    FOR SELECT TO agente
    USING (
        EXISTS (
            SELECT 1 FROM api.tickets t
            WHERE t.id = adjuntos.ticket_id
              AND (t.asignado_a = api.current_usuario_id() OR t.asignado_a IS NULL)
        )
    );

CREATE POLICY adjuntos_agente_insert ON api.adjuntos
    FOR INSERT TO agente
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM api.tickets t
            WHERE t.id = adjuntos.ticket_id
              AND (t.asignado_a = api.current_usuario_id() OR t.asignado_a IS NULL)
        )
    );

-- cliente no ve adjuntos de comentarios internos; ve adjuntos de
-- cualquier ticket de SU EMPRESA, no solo los propios.
CREATE POLICY adjuntos_cliente_select ON api.adjuntos
    FOR SELECT TO cliente
    USING (
        EXISTS (
            SELECT 1 FROM api.tickets t
            WHERE t.id = adjuntos.ticket_id
              AND t.usuario_id IN (SELECT id FROM api.usuarios WHERE empresa_id = api.current_empresa_id())
        )
        AND (
            comentario_id IS NULL
            OR EXISTS (
                SELECT 1 FROM api.comentarios c
                WHERE c.id = adjuntos.comentario_id AND c.es_interno = false
            )
        )
    );

CREATE POLICY adjuntos_cliente_insert ON api.adjuntos
    FOR INSERT TO cliente
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM api.tickets t
            WHERE t.id = adjuntos.ticket_id
              AND t.usuario_id IN (SELECT id FROM api.usuarios WHERE empresa_id = api.current_empresa_id())
        )
    );

-- ---------------------------------------------------------
-- historial_tickets (solo lectura para todos los roles de la API;
-- la escritura la hace el trigger SECURITY DEFINER)
-- ---------------------------------------------------------
ALTER TABLE api.historial_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY historial_admin_select ON api.historial_tickets
    FOR SELECT TO admin
    USING (true);

CREATE POLICY historial_agente_select ON api.historial_tickets
    FOR SELECT TO agente
    USING (
        EXISTS (
            SELECT 1 FROM api.tickets t
            WHERE t.id = historial_tickets.ticket_id
              AND (t.asignado_a = api.current_usuario_id() OR t.asignado_a IS NULL)
        )
    );

CREATE POLICY historial_cliente_select ON api.historial_tickets
    FOR SELECT TO cliente
    USING (
        EXISTS (
            SELECT 1 FROM api.tickets t
            WHERE t.id = historial_tickets.ticket_id
              AND t.usuario_id IN (SELECT id FROM api.usuarios WHERE empresa_id = api.current_empresa_id())
        )
    );
