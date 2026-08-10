-- =========================================================
-- 08_usuarios_self_signup.sql
-- Permite que agente/cliente creen su propia fila en usuarios la
-- primera vez que inician sesión, sin depender de un Lambda
-- Post-Confirmation de Cognito (queda pendiente en PLANEACION.md
-- como alternativa futura). Solo pueden insertar una fila que les
-- pertenezca (cognito_sub = su propio "sub" del JWT); no pueden
-- crear perfiles a nombre de otros usuarios.
--
-- El valor que manden en "rol" es cosmético (ver 01_schema.sql):
-- la autorización real siempre sale del JWT de Cognito, nunca de
-- esta columna, así que no hay riesgo de escalamiento de privilegios
-- aunque un usuario mande rol='admin' aquí.
-- =========================================================

GRANT INSERT ON api.usuarios TO agente, cliente;

CREATE POLICY usuarios_self_signup ON api.usuarios
    FOR INSERT TO agente, cliente
    WITH CHECK (cognito_sub = api.current_cognito_sub());
