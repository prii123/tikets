import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as cognito from '../lib/cognito'
import { decodificarToken, obtenerRolDeToken } from '../lib/jwt'
import { api } from '../lib/api'
import type { Rol, Usuario } from '../types'

interface AuthContextValue {
  cargando: boolean
  autenticado: boolean
  token: string | null
  rol: Rol | null
  perfil: Usuario | null
  iniciarSesion: (email: string, password: string) => Promise<void>
  cerrarSesion: () => void
  refrescarPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Crea la fila en api.usuarios la primera vez que este cognito_sub inicia
// sesión (ver database/08_usuarios_self_signup.sql). En logins siguientes
// solo la lee.
async function sincronizarPerfil(accessToken: string, idToken: string): Promise<Usuario> {
  const claims = decodificarToken(idToken) as unknown as {
    sub: string
    email?: string
    name?: string
    phone_number?: string
  }

  const existentes = await api.get<Usuario[]>(
    `/usuarios?cognito_sub=eq.${claims.sub}&select=*`,
    accessToken
  )
  if (existentes[0]) return existentes[0]

  const rolDelToken = (obtenerRolDeToken(accessToken) as Rol | null) ?? 'cliente'
  const creados = await api.post<Usuario[]>(
    '/usuarios',
    {
      cognito_sub: claims.sub,
      nombre: claims.name ?? claims.email ?? 'Sin nombre',
      email: claims.email ?? '',
      celular: claims.phone_number ?? null,
      rol: rolDelToken,
    },
    accessToken
  )
  return creados[0]
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)

  async function cargarSesion(sesion: cognito.Sesion) {
    setToken(sesion.accessToken)
    setIdToken(sesion.idToken)
    const p = await sincronizarPerfil(sesion.accessToken, sesion.idToken)
    setPerfil(p)
  }

  useEffect(() => {
    cognito
      .obtenerSesionActual()
      .then((sesion) => (sesion ? cargarSesion(sesion) : Promise.resolve()))
      .catch(() => undefined)
      .finally(() => setCargando(false))
  }, [])

  async function handleIniciarSesion(email: string, password: string) {
    const sesion = await cognito.iniciarSesion(email, password)
    await cargarSesion(sesion)
  }

  function handleCerrarSesion() {
    cognito.cerrarSesion()
    setToken(null)
    setIdToken(null)
    setPerfil(null)
  }

  async function refrescarPerfil() {
    if (!token || !idToken) return
    const p = await sincronizarPerfil(token, idToken)
    setPerfil(p)
  }

  const rol = token ? (obtenerRolDeToken(token) as Rol | null) : null

  const value: AuthContextValue = {
    cargando,
    autenticado: !!token,
    token,
    rol,
    perfil,
    iniciarSesion: handleIniciarSesion,
    cerrarSesion: handleCerrarSesion,
    refrescarPerfil,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
