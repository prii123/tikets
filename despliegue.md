# Despliegue — Sistema de Tickets

Guía práctica para desplegar este proyecto **desde cero en una cuenta de AWS distinta**, y para la variante donde **PostgREST corre en Docker pero la base de datos NO** (una base ya existente, alojada aparte — RDS, otra VPS, on-prem, etc.).

Para el detalle de por qué cada pieza está como está (versión de PostgREST fijada, formato de la llave JWT, etc.) revisa los comentarios en `docker/docker-compose.yml` — aquí solo se listan los pasos.

---

## 0. Arquitectura (resumen)

```
Navegador
   │
   ├──► Cognito (login, JWT)              — cuentas de usuario, NO hay registro público
   ├──► PostgREST (API REST sobre Postgres) — valida el JWT, hace SET ROLE, aplica RLS
   └──► Lambda "crear-usuario" (Function URL) — la única forma de dar de alta cuentas
                │
                └──► Cognito Admin API (AdminCreateUser, etc.)

Docker (en la instancia):
   postgres  (opcional, según la variante) ──► postgrest ──► frontend (nginx)
```

Piezas que hay que crear en la cuenta de AWS nueva:
1. **Cognito User Pool** + App Client + 3 grupos (`admin`, `agente`, `cliente`).
2. Una **instancia con Docker** (Lightsail o EC2) que corre `postgres` + `postgrest` + `frontend`, **o** solo `postgrest` + `frontend` si la base ya vive en otro lado.
3. Una **Lambda** (`crear-usuario`) con Function URL pública, para poder crear cuentas desde el frontend.
4. Un **primer usuario admin**, creado a mano (no hay registro público, así que alguien tiene que "romper el huevo").

---

## 1. Requisitos previos

- AWS CLI instalado y configurado con un perfil apuntando a la cuenta/región nueva:
  ```bash
  aws configure --profile tickets-nueva
  # AWS Access Key ID / Secret / región (ej. us-east-1) / output format: json
  ```
  Todos los comandos de abajo asumen `--profile tickets-nueva`; agrégalo si no usas el perfil por default.
- Docker + el plugin `docker compose` en la máquina donde vas a correr los contenedores.
- `psql` disponible (localmente o en la instancia) para ejecutar los `.sql` del backend.
- El repo clonado: `git clone https://github.com/prii123/tikets.git`.

---

## 2. Despliegue completo en una cuenta de AWS nueva

### 2.1 Crear el Cognito User Pool

```bash
aws cognito-idp create-user-pool \
  --profile tickets-nueva \
  --pool-name tickets-user-pool \
  --auto-verified-attributes email \
  --username-attributes email \
  --admin-create-user-config AllowAdminCreateUserOnly=true \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}}'
```

Guarda el `Id` que devuelve (`us-east-1_XXXXXXXXX`) — es tu `POOL_ID`. `AllowAdminCreateUserOnly=true` es clave: bloquea el registro público (coincide con la regla de negocio del sistema, ver [PLANEACION.md](PLANEACION.md)).

Crea el App Client (sin secreto, porque lo usa un frontend público):

```bash
aws cognito-idp create-user-pool-client \
  --profile tickets-nueva \
  --user-pool-id <POOL_ID> \
  --client-name tickets-frontend \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

Guarda el `ClientId` (`CLIENT_ID`).

Crea los 3 grupos (deben llamarse EXACTAMENTE así — coinciden con los roles de PostgreSQL en `database/04_roles.sql`):

```bash
aws cognito-idp create-group --profile tickets-nueva --user-pool-id <POOL_ID> --group-name admin
aws cognito-idp create-group --profile tickets-nueva --user-pool-id <POOL_ID> --group-name agente
aws cognito-idp create-group --profile tickets-nueva --user-pool-id <POOL_ID> --group-name cliente
```

### 2.2 Crear la instancia (Lightsail)

```bash
aws lightsail create-instances \
  --profile tickets-nueva \
  --instance-names tickets-server \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id micro_2_0 \
  --user-data file://cloud-init.sh
```

Con `cloud-init.sh` instalando Docker al arrancar:

```bash
#!/bin/bash
apt-get update
apt-get install -y docker.io docker-compose-plugin git
systemctl enable --now docker
usermod -aG docker ubuntu
```

El `bundle-id` más barato (`nano_2_0`) alcanza para probar, pero corriendo Postgres + PostgREST + Nginx juntos en la misma instancia conviene al menos `micro_2_0` o `small_2_0` para no quedarte sin RAM. Si vas a usar una base externa (sección 3), la instancia solo corre `postgrest` + `frontend` y sí puedes quedarte con la más barata.

IP estática (para no perderla si reinicias la instancia):

```bash
aws lightsail allocate-static-ip --profile tickets-nueva --static-ip-name tickets-static-ip
aws lightsail attach-static-ip --profile tickets-nueva --static-ip-name tickets-static-ip --instance-name tickets-server
aws lightsail get-static-ip --profile tickets-nueva --static-ip-name tickets-static-ip --query staticIp.ipAddress --output text
```

Ese IP es el `PUBLIC_IP` que vas a usar en todo lo demás.

### 2.3 Abrir el firewall de la instancia

```bash
aws lightsail put-instance-public-ports \
  --profile tickets-nueva \
  --instance-name tickets-server \
  --port-infos \
    fromPort=22,toPort=22,protocol=TCP \
    fromPort=80,toPort=80,protocol=TCP \
    fromPort=3000,toPort=3000,protocol=TCP
```

Puerto 22 (SSH), 80 (frontend), 3000 (PostgREST — el navegador del usuario le pega directo, por eso tiene que ser público).

### 2.4 Desplegar la Lambda `crear-usuario`

El código ya existe en [lambda/crear-usuario/index.mjs](lambda/crear-usuario/index.mjs) — no cambia, solo hay que desplegarlo en la cuenta nueva.

**Rol IAM**, con permisos acotados solo al User Pool nuevo:

```bash
cat > trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Principal": { "Service": "lambda.amazonaws.com" }, "Action": "sts:AssumeRole" }
  ]
}
EOF

aws iam create-role \
  --profile tickets-nueva \
  --role-name tickets-crear-usuario-lambda-role \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --profile tickets-nueva \
  --role-name tickets-crear-usuario-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

cat > cognito-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminListGroupsForUser",
        "cognito-idp:GetUser"
      ],
      "Resource": "arn:aws:cognito-idp:<REGION>:<ACCOUNT_ID>:userpool/<POOL_ID>"
    }
  ]
}
EOF

aws iam put-role-policy \
  --profile tickets-nueva \
  --role-name tickets-crear-usuario-lambda-role \
  --policy-name cognito-admin-acotado \
  --policy-document file://cognito-policy.json
```

**Empaquetar y crear la función** (el SDK de AWS ya viene incluido en el runtime `nodejs20.x`, no hace falta `npm install`):

```bash
cd lambda/crear-usuario
zip function.zip index.mjs
# Windows/PowerShell: Compress-Archive -Path index.mjs -DestinationPath function.zip -Force

aws lambda create-function \
  --profile tickets-nueva \
  --function-name tickets-crear-usuario \
  --runtime nodejs20.x \
  --handler index.handler \
  --role arn:aws:iam::<ACCOUNT_ID>:role/tickets-crear-usuario-lambda-role \
  --zip-file fileb://function.zip \
  --environment "Variables={USER_POOL_ID=<POOL_ID>}"
```

**Function URL pública** (el frontend la llama directo, sin pasar por API Gateway):

```bash
aws lambda create-function-url-config \
  --profile tickets-nueva \
  --function-name tickets-crear-usuario \
  --auth-type NONE \
  --cors '{"AllowOrigins":["*"],"AllowMethods":["POST"],"AllowHeaders":["authorization","content-type"]}'
```

Dos permisos son necesarios para que la URL responda (no solo uno — ver la nota en [lambda/crear-usuario/README.md](lambda/crear-usuario/README.md)):

```bash
aws lambda add-permission \
  --profile tickets-nueva \
  --function-name tickets-crear-usuario \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE

aws lambda add-permission \
  --profile tickets-nueva \
  --function-name tickets-crear-usuario \
  --statement-id FunctionURLAllowInvoke \
  --action lambda:InvokeFunction \
  --principal "*" \
  --function-url-auth-type NONE
```

Obtén la URL final:

```bash
aws lambda get-function-url-config --profile tickets-nueva --function-name tickets-crear-usuario --query FunctionUrl --output text
```

Ese valor es `VITE_CREAR_USUARIO_URL`.

### 2.5 Generar la llave JWT para PostgREST

PostgREST necesita la llave pública de Cognito para validar los JWT. **Importante:** PostgREST v14.13 (la versión que usa este proyecto) falla con "No suitable key or wrong key type" si le das el JWKS completo (`{"keys":[...]}`, normalmente con 2 llaves por rotación) — hay que darle **una sola llave suelta**, la que de verdad firma tus tokens.

```bash
# 1. Descarga el JWKS del pool nuevo
curl -s https://cognito-idp.<REGION>.amazonaws.com/<POOL_ID>/.well-known/jwks.json > jwks.json

# 2. Inicia sesión una vez (ya con el frontend desplegado, o con
#    aws cognito-idp initiate-auth) y obtén un access token real.
#    Decodifica su header (primer segmento del JWT) para ver el "kid":
echo '<PRIMER-SEGMENTO-DEL-ACCESS-TOKEN>' | base64 -d 2>/dev/null | jq .

# 3. Extrae SOLO esa llave (requiere jq)
jq --arg kid "<KID-DEL-PASO-ANTERIOR>" '.keys[] | select(.kid == $kid)' jwks.json > docker/postgrest-jwt-secret.json
```

Si Cognito rota sus llaves de firma más adelante, repite este proceso — es la causa más probable de que el login deje de funcionar de golpe con un error de JWT.

### 2.6 Clonar el repo y configurar variables de entorno

En la instancia (por SSH):

```bash
git clone https://github.com/prii123/tikets.git ~/tikets
cd ~/tikets/docker
cp .env.example .env
nano .env
```

Completa `.env` con lo generado en los pasos anteriores:

```bash
POSTGRES_PASSWORD=<algo-fuerte-y-nuevo>
AUTHENTICATOR_PASSWORD=<otra-contraseña-fuerte-y-nueva>

VITE_POSTGREST_URL=http://<PUBLIC_IP>:3000
VITE_COGNITO_REGION=<REGION>
VITE_COGNITO_USER_POOL_ID=<POOL_ID>
VITE_COGNITO_CLIENT_ID=<CLIENT_ID>
VITE_CREAR_USUARIO_URL=<FUNCTION_URL-DEL-PASO-2.4>
```

Copia también `docker/postgrest-jwt-secret.json` (generado en 2.5) a esa misma ruta en la instancia si lo creaste en tu máquina local.

### 2.7 Primer arranque

```bash
cd ~/tikets/docker
docker compose up -d
docker compose logs -f postgres    # espera a que termine de correr los .sql de init
```

La primera vez que el volumen de Postgres está vacío, se ejecutan en orden `database/01_schema.sql` → `09_seed_demo.sql` (datos de prueba — **quítalo del `docker-compose.yml` antes de ir a producción real**, ver el comentario junto a esa línea).

### 2.8 Crear el primer usuario admin (bootstrap)

No hay registro público y solo un admin/agente puede crear usuarios vía la Lambda — así que el primer admin se crea a mano, directo contra Cognito + la base de datos.

**En Cognito:**

```bash
aws cognito-idp admin-create-user \
  --profile tickets-nueva \
  --user-pool-id <POOL_ID> \
  --username admin@tudominio.com \
  --user-attributes Name=email,Value=admin@tudominio.com Name=email_verified,Value=true Name=name,Value="Administrador" \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --profile tickets-nueva \
  --user-pool-id <POOL_ID> \
  --username admin@tudominio.com \
  --password '<UnaContraseñaTemporal123>' \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --profile tickets-nueva \
  --user-pool-id <POOL_ID> \
  --username admin@tudominio.com \
  --group-name admin

# Anota el "sub" (UUID) — lo necesitas para el INSERT de abajo
aws cognito-idp admin-get-user \
  --profile tickets-nueva \
  --user-pool-id <POOL_ID> \
  --username admin@tudominio.com \
  --query "UserAttributes[?Name=='sub'].Value" --output text
```

**En la base de datos** (conectado directo con `psql`, no vía PostgREST — esto evita RLS, que bloquearía el INSERT porque todavía no existe ningún admin):

```bash
docker exec -it tickets_postgres psql -U postgres -d tickets
```

```sql
INSERT INTO api.usuarios (cognito_sub, nombre, email, rol, activo)
VALUES ('<SUB-DEL-PASO-ANTERIOR>', 'Administrador', 'admin@tudominio.com', 'admin', true);
```

### 2.9 Verificación

Entra a `http://<PUBLIC_IP>` (o `http://<PUBLIC_IP>:80`), inicia sesión con el correo/contraseña del admin recién creado, y desde `/admin/usuarios` ya puedes crear el resto de cuentas (empresas primero en `/admin/empresas`, luego usuarios cliente asociados a ellas).

---

## 3. Variante: PostgREST en Docker con una base de datos externa (no dockerizada)

Úsalo cuando la base de datos ya existe en otro lado — RDS, otra instancia, un servidor on-prem — y no quieres que Docker levante su propio Postgres.

### 3.1 Preparar la base de datos externa

Los archivos SQL en [database/](database/) están pensados para correr contra **cualquier** Postgres, dockerizado o no — no dependen de `docker-entrypoint-initdb.d`, eso es solo el mecanismo que usa la imagen oficial de Postgres para auto-ejecutarlos. Contra una base externa, se corren a mano con `psql`, en este orden:

```bash
export PGHOST=<host-de-la-base-externa>
export PGPORT=5432
export PGUSER=<usuario-con-permisos-de-owner-o-superuser>
export PGDATABASE=tickets

psql -f database/01_schema.sql
psql -f database/02_indexes.sql
psql -f database/03_functions_triggers.sql
psql -f database/04_roles.sql
psql -f database/05_grants.sql
psql -f database/06_rls_policies.sql
psql -f database/07_seed.sql
# database/09_seed_demo.sql es SOLO para pruebas — no lo corras en producción real.
```

`04_roles.sql` crea el rol `authenticator` con una contraseña placeholder (`CAMBIA_ESTA_CONTRASENA`). Reemplázala por la real:

```sql
ALTER ROLE authenticator WITH PASSWORD '<AUTHENTICATOR_PASSWORD-fuerte>';
```

(Esto es exactamente lo que hace `docker/initdb/08_set_passwords.sh` cuando el Postgres SÍ está dockerizado — aquí lo haces a mano una sola vez.)

### 3.2 docker-compose sin el servicio `postgres`

Quita el servicio `postgres` completo y el `depends_on`/healthcheck que lo referencian, y apunta `PGRST_DB_URI` al host externo. Guarda esto como `docker/docker-compose.external-db.yml`:

```yaml
services:
  postgrest:
    image: postgrest/postgrest:v14.13
    container_name: tickets_postgrest
    restart: unless-stopped
    ports:
      - "${POSTGREST_PORT:-3000}:3000"
    volumes:
      - ./postgrest-jwt-secret.json:/etc/postgrest/jwt-secret.json:ro
    environment:
      PGRST_DB_URI: postgres://authenticator:${AUTHENTICATOR_PASSWORD}@${EXTERNAL_DB_HOST}:${EXTERNAL_DB_PORT:-5432}/${EXTERNAL_DB_NAME:-tickets}?sslmode=${EXTERNAL_DB_SSLMODE:-require}
      PGRST_DB_SCHEMAS: api
      PGRST_DB_ANON_ROLE: web_anon
      PGRST_JWT_SECRET: "@/etc/postgrest/jwt-secret.json"
      PGRST_JWT_SECRET_IS_BASE64: "false"
      PGRST_JWT_ROLE_CLAIM_KEY: '."cognito:groups"[0]'
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_SERVER_PORT: 3000
    networks:
      - tickets_net

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
      args:
        VITE_POSTGREST_URL: ${VITE_POSTGREST_URL}
        VITE_COGNITO_REGION: ${VITE_COGNITO_REGION}
        VITE_COGNITO_USER_POOL_ID: ${VITE_COGNITO_USER_POOL_ID}
        VITE_COGNITO_CLIENT_ID: ${VITE_COGNITO_CLIENT_ID}
        VITE_CREAR_USUARIO_URL: ${VITE_CREAR_USUARIO_URL}
    container_name: tickets_frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-80}:80"
    networks:
      - tickets_net

networks:
  tickets_net:
    driver: bridge
```

Agrega a `docker/.env` las variables nuevas que este archivo espera:

```bash
EXTERNAL_DB_HOST=mi-base.xxxxx.us-east-1.rds.amazonaws.com
EXTERNAL_DB_PORT=5432
EXTERNAL_DB_NAME=tickets
EXTERNAL_DB_SSLMODE=require   # "disable" si tu Postgres externo no usa TLS
```

Y arranca solo con ese archivo (no el `docker-compose.yml` original, que sigue trayendo su propio `postgres`):

```bash
cd docker
docker compose -f docker-compose.external-db.yml up -d
```

### 3.3 Red y seguridad entre el host de Docker y la base externa

El contenedor `postgrest` necesita alcanzar `EXTERNAL_DB_HOST:EXTERNAL_DB_PORT` por la red. Según dónde viva cada cosa:

- **RDS en la misma VPC** que la instancia de Docker: agrega una regla de entrada en el *security group* de RDS que permita el *security group* (o la IP privada) de la instancia de Docker, puerto 5432.
- **RDS en otra VPC / otra cuenta**: necesitas VPC peering (o Transit Gateway) entre ambas VPCs, y la misma regla de security group de arriba apuntando al CIDR de la VPC de Docker.
- **Otra VPS/servidor fuera de AWS**: abre el puerto 5432 en su firewall solo para la IP pública de la instancia de Docker (nunca `0.0.0.0/0` para Postgres).
- **RDS**: por default exige SSL — deja `EXTERNAL_DB_SSLMODE=require` (o `verify-full` si además quieres validar el certificado de RDS, lo que requiere montar el CA bundle de Amazon en el contenedor de `postgrest` y agregar `&sslrootcert=...` a la URI).

Prueba la conectividad antes de asumir que es un problema de PostgREST:

```bash
docker run --rm -it postgres:16-alpine \
  psql "postgres://authenticator:<pass>@<EXTERNAL_DB_HOST>:5432/tickets?sslmode=require" -c "select 1"
```

Si esto falla, es red/firewall, no PostgREST. Si conecta pero el login desde el frontend sigue fallando, retoma la sección 2.5 (llave JWT) y revisa `docker compose logs postgrest`.

---

## 4. Actualizar un despliegue existente (redeploy)

Patrón normal después de un `git push` a `main`:

```bash
cd ~/tikets && git pull
cd docker
# si hay una migración .sql nueva en database/migracion_*.sql, aplícala primero:
docker exec -i tickets_postgres psql -U postgres -d tickets < ../database/migracion_XXXX.sql
docker compose build --no-cache frontend
docker compose up -d --force-recreate frontend
```

Si el cambio toca `docker-compose.yml` o variables de entorno de `postgrest` (no solo el frontend), agrega también:

```bash
docker compose up -d --force-recreate postgrest
```

---

## 5. Problemas típicos (ya resueltos en este repo, pero pueden reaparecer en una cuenta nueva)

- **"No suitable key or wrong key type" (PGRST301) al iniciar sesión** → la llave JWT de `docker/postgrest-jwt-secret.json` no coincide con el `kid` real de los tokens (rotación de llaves de Cognito). Repite la sección 2.5.
- **Pantalla en blanco sin error en consola** → falta `define: { global: 'globalThis' }` en `frontend/vite.config.ts` (ya está en el repo, pero si alguna vez se toca ese archivo, revisa que siga ahí).
- **403 Forbidden al llamar la Function URL de la Lambda** → faltan los dos permisos (`lambda:InvokeFunctionUrl` y `lambda:InvokeFunction`) descritos en 2.4 — desde ~oct. 2025 AWS exige ambos, no solo el primero.
- **PostgREST no arranca / rechaza `jwt-role-claim-key`** → confirma que la imagen sigue fijada a `postgrest/postgrest:v14.13` en `docker-compose.yml`; la v16 rompe el parseo de claims con comillas (`"cognito:groups"`).
- **`docker compose up -d` no aplica un rebuild nuevo** → usa `--force-recreate` en el servicio afectado; sin eso, Docker puede reportar "Running" y no levantar la imagen recién construida.
