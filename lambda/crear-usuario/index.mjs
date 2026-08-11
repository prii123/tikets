// Lambda invocada por el frontend (Function URL) para que admin/agente
// puedan crear usuarios nuevos. El navegador no puede llamar directamente
// a las APIs administrativas de Cognito (AdminCreateUser, etc.) porque
// requieren credenciales de servidor - por eso esto existe.
//
// Autorización: en vez de pedir credenciales de AWS al cliente, se recibe
// el access token del usuario que ya inició sesión (Authorization: Bearer)
// y se valida con GetUser (confirma que el token es real y sigue activo)
// + AdminListGroupsForUser (confirma que quien llama es admin o agente).
// Un agente solo puede crear usuarios con rol "cliente".
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  AdminListGroupsForUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const USER_POOL_ID = process.env.USER_POOL_ID
const client = new CognitoIdentityProviderClient({})

const CORS_HEADERS = {
  'Content-Type': 'application/json',
}

function respond(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) }
}

function generarPassword() {
  const mayus = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const minus = 'abcdefghijkmnpqrstuvwxyz'
  const nums = '23456789'
  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)]
  let pass = pick(mayus) + pick(minus) + pick(nums)
  const todos = mayus + minus + nums
  for (let i = 0; i < 9; i++) pass += pick(todos)
  return pass
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return respond(204, {})
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization
  const accessToken = authHeader?.replace(/^Bearer\s+/i, '')
  if (!accessToken) {
    return respond(401, { message: 'Falta el token de autorización.' })
  }

  let callerUsername
  try {
    const caller = await client.send(new GetUserCommand({ AccessToken: accessToken }))
    callerUsername = caller.Username
  } catch {
    return respond(401, { message: 'Token inválido o expirado.' })
  }

  const grupos = await client.send(
    new AdminListGroupsForUserCommand({ UserPoolId: USER_POOL_ID, Username: callerUsername })
  )
  const rolLlamador = grupos.Groups?.[0]?.GroupName
  if (rolLlamador !== 'admin' && rolLlamador !== 'agente') {
    return respond(403, { message: 'Solo un administrador o agente puede crear usuarios.' })
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return respond(400, { message: 'JSON inválido.' })
  }

  const { email, nombre, celular, rol, empresa_id: empresaId } = payload

  if (!email || !nombre || !rol) {
    return respond(400, { message: 'Faltan campos requeridos: email, nombre, rol.' })
  }
  if (!['admin', 'agente', 'cliente'].includes(rol)) {
    return respond(400, { message: 'Rol inválido.' })
  }
  if (rolLlamador === 'agente' && rol !== 'cliente') {
    return respond(403, { message: 'Un agente solo puede crear usuarios cliente.' })
  }
  if (rol === 'cliente' && !empresaId) {
    return respond(400, { message: 'Un usuario cliente necesita una empresa asociada.' })
  }

  const tempPassword = generarPassword()

  try {
    const userAttributes = [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'name', Value: nombre },
    ]
    if (celular) userAttributes.push({ Name: 'phone_number', Value: celular })

    const created = await client.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: userAttributes,
        MessageAction: 'SUPPRESS',
      })
    )

    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        Password: tempPassword,
        Permanent: true,
      })
    )

    await client.send(
      new AdminAddUserToGroupCommand({ UserPoolId: USER_POOL_ID, Username: email, GroupName: rol })
    )

    const sub = created.User.Attributes.find((a) => a.Name === 'sub')?.Value

    return respond(200, { cognito_sub: sub, email, password: tempPassword })
  } catch (err) {
    if (err.name === 'UsernameExistsException') {
      return respond(409, { message: 'Ya existe un usuario con ese correo.' })
    }
    return respond(500, { message: err.message || 'Error creando el usuario.' })
  }
}
