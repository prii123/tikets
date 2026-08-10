-- =========================================================
-- 04_roles.sql
-- Roles de PostgreSQL usados por PostgREST.
--
-- authenticator: único rol con LOGIN; es con el que PostgREST abre
--                la conexión (db-uri en postgrest.conf). No tiene
--                permisos propios, solo puede saltar (SET ROLE) a
--                los roles de abajo.
-- web_anon:      peticiones sin JWT o con JWT inválido/expirado.
-- admin/agente/cliente: deben llamarse EXACTAMENTE igual que los
--                Grupos de Cognito, porque PostgREST usa el claim
--                de rol del JWT para decidir a qué rol hacer SET ROLE
--                (jwt-role-claim-key = ".\"cognito:groups\"[0]" en
--                postgrest.conf, asumiendo un grupo relevante por usuario).
--
-- Cambia 'CAMBIA_ESTA_CONTRASENA' antes de ejecutar en un ambiente
-- real; debe coincidir con la contraseña usada en el db-uri de
-- PostgREST para el rol authenticator.
-- =========================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'CAMBIA_ESTA_CONTRASENA';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'web_anon') THEN
        CREATE ROLE web_anon NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agente') THEN
        CREATE ROLE agente NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cliente') THEN
        CREATE ROLE cliente NOLOGIN;
    END IF;
END
$$;

GRANT web_anon, admin, agente, cliente TO authenticator;
