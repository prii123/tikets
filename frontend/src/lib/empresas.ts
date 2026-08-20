import { api } from './api'
import type { Empresa, Usuario } from '../types'

export function listarEmpresas(token: string): Promise<Empresa[]> {
  return api.get<Empresa[]>('/empresas?order=nombre.asc', token)
}

export function crearEmpresa(
  datos: { nombre: string; descripcion?: string | null },
  token: string
): Promise<Empresa[]> {
  return api.post<Empresa[]>('/empresas', datos, token)
}

export function actualizarEmpresa(
  id: number,
  cambios: Partial<Pick<Empresa, 'nombre' | 'descripcion' | 'activa'>>,
  token: string
): Promise<Empresa[]> {
  return api.patch<Empresa[]>(`/empresas?id=eq.${id}`, cambios, token)
}

// Para el selector en cascada de "nuevo ticket a nombre de un cliente"
// (agente/admin): primero eliges empresa, esto trae solo sus clientes.
export function listarClientesPorEmpresa(empresaId: number, token: string): Promise<Usuario[]> {
  return api.get<Usuario[]>(
    `/usuarios?rol=eq.cliente&empresa_id=eq.${empresaId}&activo=eq.true&order=nombre.asc`,
    token
  )
}
