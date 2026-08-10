-- =========================================================
-- 07_seed.sql
-- Datos iniciales de catálogos. Idempotente: se puede correr
-- varias veces sin duplicar filas.
-- =========================================================

INSERT INTO api.prioridades (nombre, nivel) VALUES
    ('Crítica', 1),
    ('Alta',    2),
    ('Media',   3),
    ('Baja',    4)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO api.estados (nombre, es_final) VALUES
    ('Abierto',                 false),
    ('En progreso',             false),
    ('En espera del usuario',   false),
    ('Resuelto',                true),
    ('Cerrado',                 true)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO api.categorias (nombre, descripcion) VALUES
    ('Error del sistema',    'Fallas o comportamiento inesperado del software'),
    ('Solicitud de función', 'Peticiones de nuevas funcionalidades o mejoras'),
    ('Facturación',          'Dudas o problemas relacionados a pagos y facturación'),
    ('Soporte técnico',      'Ayuda general de uso del sistema'),
    ('Otro',                 'Cualquier caso que no encaje en las categorías anteriores')
ON CONFLICT (nombre) DO NOTHING;
