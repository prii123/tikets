-- =========================================================
-- 09_seed_demo.sql
-- Datos de PRUEBA (empresas, usuarios, tickets, comentarios y
-- adjuntos ficticios) para tener un ambiente navegable de un vistazo.
--
-- NO usar en producción: quita el mount de este archivo en
-- docker/docker-compose.yml antes de un despliegue real.
--
-- Los usuarios de prueba (excepto el admin, que es tu cuenta real de
-- Cognito) tienen un cognito_sub aleatorio que NO corresponde a
-- ninguna cuenta real: sirven para ver la interfaz poblada, no para
-- iniciar sesión con ellos.
-- =========================================================

-- ---- admin real (la cuenta ya existe en Cognito) ----
INSERT INTO api.usuarios (cognito_sub, nombre, email, rol, empresa_id, activo)
VALUES ('e4288468-6031-7085-3ba8-1e7401bba56d', 'Administrador', 'printsvallejos@gmail.com', 'admin', NULL, true)
ON CONFLICT (cognito_sub) DO NOTHING;

-- ---- empresas cliente ----
INSERT INTO api.empresas (nombre, descripcion) VALUES
    ('Constructora Andina S.A.',    'Construcción e infraestructura'),
    ('Distribuidora El Progreso',   'Distribución mayorista de abarrotes'),
    ('Textiles Manizales',          'Manufactura y venta de textiles'),
    ('Grupo Financiero Horizonte',  'Servicios financieros y crédito'),
    ('Comercializadora San Isidro', 'Comercio agrícola'),
    ('TechSoluciones Bogotá',       'Consultoría y desarrollo de software')
ON CONFLICT (nombre) DO NOTHING;

-- ---- agentes de soporte (personal interno, sin empresa) ----
INSERT INTO api.usuarios (cognito_sub, nombre, email, rol, empresa_id, activo) VALUES
    (gen_random_uuid(), 'Laura Gómez',    'laura.gomez@tickets.demo',    'agente', NULL, true),
    (gen_random_uuid(), 'Carlos Ramírez', 'carlos.ramirez@tickets.demo', 'agente', NULL, true),
    (gen_random_uuid(), 'Ana Torres',     'ana.torres@tickets.demo',     'agente', NULL, true)
ON CONFLICT (email) DO NOTHING;

-- ---- clientes: 2-3 por empresa ----
DO $$
DECLARE
    v_empresa   RECORD;
    v_nombres   TEXT[] := ARRAY[
        'María López', 'Jorge Pérez', 'Sofía Castro', 'Diego Herrera',
        'Valentina Ríos', 'Andrés Molina', 'Camila Vargas', 'Felipe Ortiz',
        'Daniela Reyes', 'Sebastián Cruz', 'Isabella Duarte', 'Mateo Salazar',
        'Paula Jiménez', 'Nicolás Restrepo'
    ];
    v_idx       INT := 1;
    v_por_empresa INT;
BEGIN
    FOR v_empresa IN SELECT id FROM api.empresas ORDER BY id LOOP
        v_por_empresa := 2 + floor(random() * 2)::int; -- 2 o 3 clientes
        FOR i IN 1..v_por_empresa LOOP
            INSERT INTO api.usuarios (cognito_sub, nombre, email, rol, empresa_id, activo)
            VALUES (
                gen_random_uuid(),
                v_nombres[((v_idx - 1) % array_length(v_nombres, 1)) + 1],
                'cliente' || v_idx || '@tickets.demo',
                'cliente',
                v_empresa.id,
                true
            )
            ON CONFLICT (email) DO NOTHING;
            v_idx := v_idx + 1;
        END LOOP;
    END LOOP;
END $$;

-- ---- tickets, comentarios y adjuntos: varios por cliente ----
DO $$
DECLARE
    v_cliente        RECORD;
    v_agente_ids     INT[];
    v_categoria_ids  INT[];
    v_prioridad_ids  INT[];
    v_estado_ids     INT[];
    v_titulos        TEXT[] := ARRAY[
        'No puedo iniciar sesión en el sistema',
        'Error al generar el reporte mensual',
        'Solicito acceso para un nuevo empleado',
        'La página se queda cargando indefinidamente',
        'Duda sobre el cobro de este mes',
        'Necesito exportar mis datos a Excel',
        'El botón de guardar no responde',
        'Solicitud de nueva funcionalidad: filtros avanzados',
        'Factura con monto incorrecto',
        'No llegan las notificaciones por correo',
        'Error 500 al subir un archivo adjunto',
        'Consulta sobre el plan de servicio actual'
    ];
    v_titulo         TEXT;
    v_ticket_id      INT;
    v_agente_id      INT;
    n                INT;
BEGIN
    SELECT array_agg(id) INTO v_agente_ids    FROM api.usuarios WHERE rol = 'agente';
    SELECT array_agg(id) INTO v_categoria_ids FROM api.categorias;
    SELECT array_agg(id) INTO v_prioridad_ids FROM api.prioridades;
    SELECT array_agg(id) INTO v_estado_ids    FROM api.estados;

    FOR v_cliente IN SELECT id FROM api.usuarios WHERE rol = 'cliente' LOOP
        FOR n IN 1..(2 + floor(random() * 2)::int) LOOP -- 2 o 3 tickets por cliente
            v_titulo := v_titulos[1 + floor(random() * array_length(v_titulos, 1))::int];
            v_agente_id := CASE WHEN random() < 0.7
                THEN v_agente_ids[1 + floor(random() * array_length(v_agente_ids, 1))::int]
                ELSE NULL END;

            INSERT INTO api.tickets
                (titulo, descripcion, usuario_id, asignado_a, categoria_id, prioridad_id, estado_id, creado_en)
            VALUES (
                v_titulo,
                v_titulo || '. Descripción de prueba generada para poblar el ambiente de desarrollo.',
                v_cliente.id,
                v_agente_id,
                v_categoria_ids[1 + floor(random() * array_length(v_categoria_ids, 1))::int],
                v_prioridad_ids[1 + floor(random() * array_length(v_prioridad_ids, 1))::int],
                v_estado_ids[1 + floor(random() * array_length(v_estado_ids, 1))::int],
                now() - (floor(random() * 30)::int || ' days')::interval
            )
            RETURNING id INTO v_ticket_id;

            -- comentario inicial del cliente
            INSERT INTO api.comentarios (ticket_id, usuario_id, contenido, es_interno, creado_en)
            VALUES (
                v_ticket_id, v_cliente.id,
                'Buen día, quedo atento a una respuesta. Gracias.',
                false,
                now() - (floor(random() * 20)::int || ' days')::interval
            );

            -- respuesta del agente (si hay uno asignado)
            IF v_agente_id IS NOT NULL AND random() < 0.8 THEN
                INSERT INTO api.comentarios (ticket_id, usuario_id, contenido, es_interno, creado_en)
                VALUES (
                    v_ticket_id, v_agente_id,
                    'Estamos revisando tu caso, te confirmamos en breve.',
                    false,
                    now() - (floor(random() * 15)::int || ' days')::interval
                );
            END IF;

            -- nota interna ocasional (no visible para el cliente)
            IF v_agente_ids IS NOT NULL AND random() < 0.35 THEN
                INSERT INTO api.comentarios (ticket_id, usuario_id, contenido, es_interno, creado_en)
                VALUES (
                    v_ticket_id,
                    v_agente_ids[1 + floor(random() * array_length(v_agente_ids, 1))::int],
                    'Nota interna: pendiente validar con el equipo de infraestructura.',
                    true,
                    now() - (floor(random() * 10)::int || ' days')::interval
                );
            END IF;

            -- adjunto ocasional (enlace de ejemplo)
            IF random() < 0.25 THEN
                INSERT INTO api.adjuntos (ticket_id, nombre_archivo, ruta, tipo_mime)
                VALUES (
                    v_ticket_id,
                    'captura_pantalla.png',
                    'https://ejemplo-storage.local/adjuntos/captura_pantalla.png',
                    'image/png'
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ---- avanza ~40% de los tickets a un estado distinto de "Abierto" para
-- que el trigger de historial (03_functions_triggers.sql) genere
-- entradas reales, en vez de fabricarlas a mano ----
DO $$
DECLARE
    v_ticket        RECORD;
    v_estado_final  INT;
    v_estado_medio  INT;
BEGIN
    SELECT id INTO v_estado_medio FROM api.estados WHERE nombre = 'En progreso';
    SELECT id INTO v_estado_final FROM api.estados WHERE nombre = 'Resuelto';

    FOR v_ticket IN
        SELECT id FROM api.tickets WHERE random() < 0.4
    LOOP
        UPDATE api.tickets
        SET estado_id = CASE WHEN random() < 0.5 THEN v_estado_medio ELSE v_estado_final END
        WHERE id = v_ticket.id;
    END LOOP;
END $$;
