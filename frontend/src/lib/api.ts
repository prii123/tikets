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
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
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

  if (res.status === 204) return undefined as T
  const texto = await res.text()
  return (texto ? JSON.parse(texto) : undefined) as T
}

export const api = {
  get: <T>(path: string, token: string | null) => request<T>(path, { token }),
  post: <T>(path: string, body: unknown, token: string | null, prefer = 'return=representation') =>
    request<T>(path, { method: 'POST', body, token, prefer }),
  patch: <T>(path: string, body: unknown, token: string | null, prefer = 'return=representation') =>
    request<T>(path, { method: 'PATCH', body, token, prefer }),
}
