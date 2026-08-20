import { config } from '../config'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  prefer?: string
  token?: string | null
  headers?: Record<string, string>
}

async function doFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options.headers }
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.prefer) headers.Prefer = options.prefer

  const res = await fetch(`${config.postgrestUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    let mensaje = `${res.status} ${res.statusText}`
    try {
      const cuerpo = await res.json()
      mensaje = cuerpo.message ?? cuerpo.hint ?? mensaje
    } catch {
      // el cuerpo de error no era JSON, se usa el mensaje por defecto
    }
    throw new ApiError(res.status, mensaje)
  }

  return res
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await doFetch(path, options)
  if (res.status === 204) return undefined as T
  const texto = await res.text()
  return (texto ? JSON.parse(texto) : undefined) as T
}

export interface Pagina<T> {
  datos: T[]
  total: number
}

// PostgREST: Prefer: count=exact + Range devuelve, en la respuesta, un
// header Content-Range con la forma "inicio-fin/total" (o "*/0" si no
// hay filas). De ahí se saca el total sin pedir una segunda consulta.
//
// No usa doFetch: si pides una página que ya no existe (ej. cambiaste de
// filtro, o alguien borró filas, mientras estabas en una página más
// adelante) PostgREST responde 416 "Requested range not satisfiable" —
// pero SIGUE mandando el total real en Content-Range. Tratamos ese caso
// puntual como "página vacía" en vez de un error, para no romper la
// pantalla; cualquier otro código de error sí se propaga como siempre.
async function requestPagina<T>(path: string, pagina: number, porPagina: number, token: string | null): Promise<Pagina<T>> {
  const desde = (pagina - 1) * porPagina
  const hasta = desde + porPagina - 1
  const separador = path.includes('?') ? '&' : '?'
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Range: `${desde}-${hasta}` }
  if (token) headers.Authorization = `Bearer ${token}`
  headers.Prefer = 'count=exact'

  const res = await fetch(`${config.postgrestUrl}${path}${separador}limit=${porPagina}&offset=${desde}`, {
    method: 'GET',
    headers,
  })

  const contentRange = res.headers.get('content-range') ?? '*/0'
  const total = Number(contentRange.split('/')[1]) || 0

  if (res.status === 416) return { datos: [], total }

  if (!res.ok) {
    let mensaje = `${res.status} ${res.statusText}`
    try {
      const cuerpo = await res.json()
      mensaje = cuerpo.message ?? cuerpo.hint ?? mensaje
    } catch {
      // el cuerpo de error no era JSON, se usa el mensaje por defecto
    }
    throw new ApiError(res.status, mensaje)
  }

  const texto = await res.text()
  const datos = (texto ? JSON.parse(texto) : []) as T[]
  return { datos, total }
}

export const api = {
  get: <T>(path: string, token: string | null) => request<T>(path, { token }),
  getPagina: <T>(path: string, pagina: number, porPagina: number, token: string | null) =>
    requestPagina<T>(path, pagina, porPagina, token),
  post: <T>(path: string, body: unknown, token: string | null, prefer = 'return=representation') =>
    request<T>(path, { method: 'POST', body, token, prefer }),
  patch: <T>(path: string, body: unknown, token: string | null, prefer = 'return=representation') =>
    request<T>(path, { method: 'PATCH', body, token, prefer }),
}
