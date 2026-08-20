-- =========================================================
-- 03_functions_triggers.sql
-- Funciones auxiliares para leer el JWT de Cognito y
-- triggers de mantenimiento (actualizado_en, cierre e historial).
-- =========================================================

-- ---------------------------------------------------------
-- api.jwt_claims() / api.current_cognito_sub()
-- PostgREST expone el payload del JWT validado en el GUC
-- request.jwt.claims. Estas funciones lo leen para saber
-- quién está haciendo la petición.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION api.jwt_claims() RETURNS json
LANGUAGE sql STABLE
AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::json
$$;

CREATE OR REPLACE FUNCTION api.current_cognito_sub() RETURNS uuid
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(api.jwt_claims()->>'sub', '')::uuid
$$;

-- current_usuario_id() corre como SECURITY DEFINER porque necesita
-- leer api.usuarios (por cognito_sub) para resolver quién hace la
-- petición ANTES de que las políticas RLS de esa misma tabla (que
-- dependen de esta función) se puedan evaluar. Sin esto habría una
-- referencia circular.
CREATE OR REPLACE FUNCTION api.current_usuario_id() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = api, pg_temp
AS $$
    SELECT id FROM api.usuarios WHERE cognito_sub = api.current_cognito_sub()
$$;

-- Empresa del usuario actual (NULL para admin/agente, que no pertenecen
-- a ninguna). SECURITY DEFINER por la misma razón que current_usuario_id():
-- las políticas de "visibilidad por empresa" la usan y necesitan
-- resolverla sin depender de sus propias políticas RLS.
CREATE OR REPLACE FUNCTION api.current_empresa_id() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = api, pg_temp
AS $$
    SELECT empresa_id FROM api.usuarios WHERE id = api.current_usuario_id()
$$;

-- ---------------------------------------------------------
-- Mantiene tickets.actualizado_en y controla cerrado_en según
-- si el nuevo estado es terminal (estados.es_final).
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION api.tickets_before_update() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    nuevo_es_final BOOLEAN;
BEGIN
    NEW.actualizado_en := now();

    IF NEW.estado_id IS DISTINCT FROM OLD.estado_id THEN
        SELECT es_final INTO nuevo_es_final FROM api.estados WHERE id = NEW.estado_id;
        IF nuevo_es_final THEN
            NEW.cerrado_en := now();
        ELSE
            NEW.cerrado_en := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_before_update ON api.tickets;
CREATE TRIGGER trg_tickets_before_update
    BEFORE UPDATE ON api.tickets
    FOR EACH ROW
    EXECUTE FUNCTION api.tickets_before_update();

-- ---------------------------------------------------------
-- Registra en historial_tickets cada cambio de estado, prioridad
-- o asignación. SECURITY DEFINER porque ningún rol de la API
-- tiene INSERT directo sobre historial_tickets: solo se llena
-- a través de este trigger.
-- ---------------------------------------------------------
-- Guarda NOMBRES legibles en valor_anterior/valor_nuevo (no los IDs
-- crudos de la FK): así el historial se puede mostrar tal cual sin que
-- el frontend tenga que resolver por separado a qué estado/prioridad/
-- usuario correspondía cada id, y queda como una foto de cómo se
-- llamaba en ese momento (aunque después se renombre o se borre).
CREATE OR REPLACE FUNCTION api.tickets_registrar_historial() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = api, pg_temp
AS $$
DECLARE
    v_anterior TEXT;
    v_nuevo    TEXT;
BEGIN
    IF NEW.estado_id IS DISTINCT FROM OLD.estado_id THEN
        SELECT nombre INTO v_anterior FROM api.estados WHERE id = OLD.estado_id;
        SELECT nombre INTO v_nuevo    FROM api.estados WHERE id = NEW.estado_id;
        INSERT INTO api.historial_tickets (ticket_id, usuario_id, campo, valor_anterior, valor_nuevo)
        VALUES (NEW.id, api.current_usuario_id(), 'estado_id', v_anterior, v_nuevo);
    END IF;

    IF NEW.prioridad_id IS DISTINCT FROM OLD.prioridad_id THEN
        SELECT nombre INTO v_anterior FROM api.prioridades WHERE id = OLD.prioridad_id;
        SELECT nombre INTO v_nuevo    FROM api.prioridades WHERE id = NEW.prioridad_id;
        INSERT INTO api.historial_tickets (ticket_id, usuario_id, campo, valor_anterior, valor_nuevo)
        VALUES (NEW.id, api.current_usuario_id(), 'prioridad_id', v_anterior, v_nuevo);
    END IF;

    IF NEW.asignado_a IS DISTINCT FROM OLD.asignado_a THEN
        SELECT nombre INTO v_anterior FROM api.usuarios WHERE id = OLD.asignado_a;
        SELECT nombre INTO v_nuevo    FROM api.usuarios WHERE id = NEW.asignado_a;
        INSERT INTO api.historial_tickets (ticket_id, usuario_id, campo, valor_anterior, valor_nuevo)
        VALUES (
            NEW.id, api.current_usuario_id(), 'asignado_a',
            COALESCE(v_anterior, 'Sin asignar'), COALESCE(v_nuevo, 'Sin asignar')
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_registrar_historial ON api.tickets;
CREATE TRIGGER trg_tickets_registrar_historial
    AFTER UPDATE ON api.tickets
    FOR EACH ROW
    EXECUTE FUNCTION api.tickets_registrar_historial();
