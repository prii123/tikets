-- =========================================================
-- 01_schema.sql
-- Esquema y tablas del sistema de tickets.
-- Todo el modelo vive en el schema `api`, que es el único
-- schema expuesto a PostgREST (db-schemas = "api" en postgrest.conf).
-- =========================================================

CREATE SCHEMA IF NOT EXISTS api;

-- ---------------------------------------------------------
-- empresas
-- Empresas cliente. Cada usuario con rol 'cliente' pertenece a
-- una; admin/agente son personal interno y no pertenecen a ninguna.
-- ---------------------------------------------------------
CREATE TABLE api.empresas (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activa      BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- usuarios
-- Espejo local de las cuentas de Cognito. NO hay auto-registro:
-- solo admin/agente pueden crear usuarios (ver 06_rls_policies.sql),
-- típicamente después de crear la cuenta en Cognito con AdminCreateUser.
-- No guarda contraseñas: la autenticación vive en Cognito.
-- ---------------------------------------------------------
CREATE TABLE api.usuarios (
    id          SERIAL PRIMARY KEY,
    cognito_sub UUID NOT NULL UNIQUE,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    celular     VARCHAR(20),
    rol         VARCHAR(30) NOT NULL DEFAULT 'cliente'
                CHECK (rol IN ('admin', 'agente', 'cliente')),
    empresa_id  INT REFERENCES api.empresas(id),
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Todo cliente pertenece a una empresa; admin/agente no pertenecen a ninguna.
    CONSTRAINT usuarios_cliente_requiere_empresa
        CHECK (rol <> 'cliente' OR empresa_id IS NOT NULL)
);

-- ---------------------------------------------------------
-- categorias
-- ---------------------------------------------------------
CREATE TABLE api.categorias (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(80) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activa      BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------
-- prioridades
-- nivel = 1 es la más urgente.
-- ---------------------------------------------------------
CREATE TABLE api.prioridades (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    nivel  INT NOT NULL UNIQUE
);

-- ---------------------------------------------------------
-- estados
-- ---------------------------------------------------------
CREATE TABLE api.estados (
    id       SERIAL PRIMARY KEY,
    nombre   VARCHAR(40) NOT NULL UNIQUE,
    es_final BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------
-- tickets
-- ---------------------------------------------------------
CREATE TABLE api.tickets (
    id              SERIAL PRIMARY KEY,
    titulo          VARCHAR(150) NOT NULL,
    descripcion     TEXT NOT NULL,
    usuario_id      INT NOT NULL REFERENCES api.usuarios(id),
    asignado_a      INT REFERENCES api.usuarios(id),
    categoria_id    INT NOT NULL REFERENCES api.categorias(id),
    prioridad_id    INT NOT NULL REFERENCES api.prioridades(id),
    estado_id       INT NOT NULL REFERENCES api.estados(id),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    cerrado_en      TIMESTAMPTZ
);

-- ---------------------------------------------------------
-- comentarios
-- ---------------------------------------------------------
CREATE TABLE api.comentarios (
    id          SERIAL PRIMARY KEY,
    ticket_id   INT NOT NULL REFERENCES api.tickets(id) ON DELETE CASCADE,
    usuario_id  INT NOT NULL REFERENCES api.usuarios(id),
    contenido   TEXT NOT NULL,
    es_interno  BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- adjuntos
-- ---------------------------------------------------------
CREATE TABLE api.adjuntos (
    id              SERIAL PRIMARY KEY,
    ticket_id       INT NOT NULL REFERENCES api.tickets(id) ON DELETE CASCADE,
    comentario_id   INT REFERENCES api.comentarios(id) ON DELETE CASCADE,
    nombre_archivo  VARCHAR(255) NOT NULL,
    ruta            VARCHAR(500) NOT NULL,
    tipo_mime       VARCHAR(100),
    tamano_bytes    BIGINT,
    subido_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- historial_tickets
-- Se llena automáticamente por trigger (ver 03_functions_triggers.sql),
-- no por inserción directa de los roles de la API.
-- ---------------------------------------------------------
CREATE TABLE api.historial_tickets (
    id              SERIAL PRIMARY KEY,
    ticket_id       INT NOT NULL REFERENCES api.tickets(id) ON DELETE CASCADE,
    usuario_id      INT REFERENCES api.usuarios(id),
    campo           VARCHAR(50) NOT NULL,
    valor_anterior  VARCHAR(255),
    valor_nuevo     VARCHAR(255),
    fecha           TIMESTAMPTZ NOT NULL DEFAULT now()
);
