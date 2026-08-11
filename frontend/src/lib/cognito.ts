import {
  CognitoUser,
  CognitoUserPool,
  AuthenticationDetails,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js'
import { config } from '../config'

const userPool = new CognitoUserPool({
  UserPoolId: config.cognito.userPoolId,
  ClientId: config.cognito.clientId,
})

export interface Sesion {
  accessToken: string
  idToken: string
}

function sessionToTokens(session: CognitoUserSession): Sesion {
  return {
    accessToken: session.getAccessToken().getJwtToken(),
    idToken: session.getIdToken().getJwtToken(),
  }
}

export function iniciarSesion(email: string, password: string): Promise<Sesion> {
  const usuario = new CognitoUser({ Username: email, Pool: userPool })
  const detalles = new AuthenticationDetails({ Username: email, Password: password })

  return new Promise((resolve, reject) => {
    usuario.authenticateUser(detalles, {
      onSuccess: (session) => resolve(sessionToTokens(session)),
      onFailure: (err) => reject(err),
      // Cognito puede pedir un cambio de contraseña la primera vez que un
      // admin crea la cuenta manualmente (estado FORCE_CHANGE_PASSWORD).
      newPasswordRequired: () => {
        reject(
          new Error(
            'Tu cuenta requiere un cambio de contraseña. Usa "¿Olvidaste tu contraseña?" para definir una nueva.'
          )
        )
      },
    })
  })
}

export function solicitarRecuperacion(email: string): Promise<void> {
  const usuario = new CognitoUser({ Username: email, Pool: userPool })
  return new Promise((resolve, reject) => {
    usuario.forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    })
  })
}

export function confirmarRecuperacion(
  email: string,
  codigo: string,
  nuevaPassword: string
): Promise<void> {
  const usuario = new CognitoUser({ Username: email, Pool: userPool })
  return new Promise((resolve, reject) => {
    usuario.confirmPassword(codigo, nuevaPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    })
  })
}

export function cerrarSesion(): void {
  userPool.getCurrentUser()?.signOut()
}

export function obtenerSesionActual(): Promise<Sesion | null> {
  const usuario = userPool.getCurrentUser()
  if (!usuario) return Promise.resolve(null)

  return new Promise((resolve) => {
    usuario.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null)
        return
      }
      resolve(sessionToTokens(session))
    })
  })
}
