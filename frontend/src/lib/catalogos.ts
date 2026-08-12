import { api } from './api'
import type { Categoria, Prioridad } from '../types'

// A diferencia de listarCategorias/listarPrioridades en tickets.ts (que
// solo traen categorías activas, para el formulario de nuevo ticket),
// estas traen todo — la pantalla de administración necesita ver también
// las inactivas para poder reactivarlas.
export function listarCategoriasAdmin(token: string): Promise<Categoria[]> {
  return api.get<Categoria[]>('/categorias?order=nombre.asc', token)
}

export function crearCategoria(
  datos: { nombre: string; descripcion?: string | null },
  token: string
): Promise<Categoria[]> {
  return api.post<Categoria[]>('/categorias', datos, token)
}

export function actualizarCategoria(
  id: number,
  cambios: Partial<Pick<Categoria, 'nombre' | 'descripcion' | 'activa'>>,
  token: string
): Promise<Categoria[]> {
  return api.patch<Categoria[]>(`/categorias?id=eq.${id}`, cambios, token)
}

export function listarPrioridadesAdmin(token: string): Promise<Prioridad[]> {
  return api.get<Prioridad[]>('/prioridades?order=nivel.asc', token)
}

export function crearPrioridad(
  datos: { nombre: string; nivel: number },
  token: string
): Promise<Prioridad[]> {
  return api.post<Prioridad[]>('/prioridades', datos, token)
}

export function actualizarPrioridad(
  id: number,
  cambios: Partial<Pick<Prioridad, 'nombre' | 'nivel'>>,
  token: string
): Promise<Prioridad[]> {
  return api.patch<Prioridad[]>(`/prioridades?id=eq.${id}`, cambios, token)
}
