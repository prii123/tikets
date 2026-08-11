import { api } from './api'
import type { Empresa } from '../types'

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
