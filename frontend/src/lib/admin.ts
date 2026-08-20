import { config } from '../config'
import { api, ApiError, type Pagina } from './api'
import type { Rol, Usuario } from '../types'

export function listarUsuariosPagina(pagina: number, porPagina: number, token: string): Promise<Pagina<Usuario>> {
  return api.getPagina<Usuario>(
    '/usuarios?select=id,nombre,email,rol,activo,empresa:empresas(id,nombre)&order=creado_en.desc',
    pagina,
    porPagina,
    token
  )
}

export interface NuevoUsuarioInput {
  email: string
  nombre: string
  celular?: string
  rol: Rol
  empresa_id?: number | null
}

interface RespuestaLambdaCrearUsuario {
  cognito_sub: string
  email: string
  password: string
}

// 1) Crea la cuenta en Cognito (vía Lambda, ya que el navegador no puede
//    llamar AdminCreateUser directamente) y 2) inserta el espejo local en
//    api.usuarios. La Lambda ya valida que quien llama sea admin/agente y
//    que un agente solo pueda crear usuarios "cliente" — RLS lo vuelve a
//    validar del lado de la base de datos como segunda capa.
export async function crearUsuario(
  datos: NuevoUsuarioInput,
  token: string
): Promise<{ passwordTemporal: string }> {
  const res = await fetch(config.crearUsuarioUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(datos),
  })

  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({}))
    throw new ApiError(res.status, cuerpo.message ?? 'No se pudo crear la cuenta en Cognito')
  }

  const { cognito_sub, password }: RespuestaLambdaCrearUsuario = await res.json()

  await api.post<Usuario[]>(
    '/usuarios',
    {
      cognito_sub,
      nombre: datos.nombre,
      email: datos.email,
      celular: datos.celular || null,
      rol: datos.rol,
      empresa_id: datos.rol === 'cliente' ? datos.empresa_id : null,
    },
    token
  )

  return { passwordTemporal: password }
}
