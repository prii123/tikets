import { api, type Pagina } from './api'
import type { Empresa, Usuario } from '../types'

// Sin paginar: para selectores <select> (nuevo ticket, nuevo usuario) que
// necesitan la lista completa, no una página.
export function listarEmpresas(token: string): Promise<Empresa[]> {
  return api.get<Empresa[]>('/empresas?order=nombre.asc', token)
}

// Paginada: para la tabla de administración de empresas.
export function listarEmpresasPagina(pagina: number, porPagina: number, token: string): Promise<Pagina<Empresa>> {
  return api.getPagina<Empresa>('/empresas?order=nombre.asc', pagina, porPagina, token)
}

export function crearEmpresa(
  datos: { nombre: string; descripcion?: string | null; correo?: string | null },
  token: string
): Promise<Empresa[]> {
  return api.post<Empresa[]>('/empresas', datos, token)
}

export function actualizarEmpresa(
  id: number,
  cambios: Partial<Pick<Empresa, 'nombre' | 'descripcion' | 'correo' | 'activa'>>,
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
