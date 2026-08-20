-- =========================================================
-- 02_indexes.sql
-- Índices para las llaves foráneas más consultadas.
-- (Postgres no las indexa automáticamente, a diferencia de las PK).
-- =========================================================

CREATE INDEX idx_usuarios_empresa_id ON api.usuarios(empresa_id);

CREATE INDEX idx_tickets_usuario_id    ON api.tickets(usuario_id);
CREATE INDEX idx_tickets_creado_por_id ON api.tickets(creado_por_id);
CREATE INDEX idx_tickets_asignado_a   ON api.tickets(asignado_a);
CREATE INDEX idx_tickets_categoria_id ON api.tickets(categoria_id);
CREATE INDEX idx_tickets_prioridad_id ON api.tickets(prioridad_id);
CREATE INDEX idx_tickets_estado_id    ON api.tickets(estado_id);

CREATE INDEX idx_comentarios_ticket_id  ON api.comentarios(ticket_id);
CREATE INDEX idx_comentarios_usuario_id ON api.comentarios(usuario_id);

CREATE INDEX idx_adjuntos_ticket_id     ON api.adjuntos(ticket_id);
CREATE INDEX idx_adjuntos_comentario_id ON api.adjuntos(comentario_id);

CREATE INDEX idx_historial_ticket_id ON api.historial_tickets(ticket_id);
