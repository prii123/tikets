#!/bin/bash
# Corre después de 07_seed.sql dentro del contenedor de postgres (init only,
# se ejecuta una sola vez, la primera vez que el volumen de datos está vacío).
# 04_roles.sql crea el rol "authenticator" con una contraseña placeholder;
# aquí se sobreescribe con la real, tomada de la variable de entorno
# AUTHENTICATOR_PASSWORD del propio contenedor.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    ALTER ROLE authenticator WITH PASSWORD '${AUTHENTICATOR_PASSWORD}';
EOSQL
