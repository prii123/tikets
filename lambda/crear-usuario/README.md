# crear-usuario

Lambda invocada por el frontend (`/admin/usuarios`) para crear cuentas en
Cognito. El navegador no puede llamar `AdminCreateUser` directamente
porque requiere credenciales de servidor — por eso existe esta función.

Autorización: recibe el access token del usuario ya logueado
(`Authorization: Bearer ...`), lo valida contra Cognito con `GetUser`, y
confirma que pertenece al grupo `admin` o `agente` con
`AdminListGroupsForUser` antes de crear nada. Un `agente` solo puede
crear usuarios con rol `cliente`.

Ya está desplegada:
- Función: `tickets-crear-usuario` (us-east-1, cuenta 713881794009)
- Function URL: `https://ts6cvigeac3hy4i2yhppgvprim0oftxz.lambda-url.us-east-1.on.aws/`
- Rol IAM: `tickets-crear-usuario-lambda-role` (permisos acotados solo al
  User Pool `us-east-1_KI7WfnGVS`)

## Redesplegar después de editar `index.mjs`

```bash
cd lambda/crear-usuario
# Windows (PowerShell):
Compress-Archive -Path index.mjs -DestinationPath function.zip -Force
# o en Bash con zip instalado:
zip function.zip index.mjs

aws lambda update-function-code \
  --profile responsabilidades \
  --function-name tickets-crear-usuario \
  --zip-file fileb://function.zip
```

No usa dependencias externas (el SDK de AWS ya viene incluido en el
runtime `nodejs20.x` de Lambda), así que no hace falta `npm install`
antes de empaquetar.
