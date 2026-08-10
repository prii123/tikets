import { jwtDecode } from 'jwt-decode'

interface CognitoAccessTokenClaims {
  sub: string
  'cognito:groups'?: string[]
  exp: number
}

export function decodificarToken(token: string): CognitoAccessTokenClaims {
  return jwtDecode<CognitoAccessTokenClaims>(token)
}

export function obtenerRolDeToken(token: string): string | null {
  const grupos = decodificarToken(token)['cognito:groups']
  return grupos && grupos.length > 0 ? grupos[0] : null
}
