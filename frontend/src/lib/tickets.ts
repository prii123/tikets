import { api } from './api'
import type { Categoria, Comentario, Estado, Prioridad, Ticket, Usuario } from '../types'

const LISTA_SELECT =
  'id,titulo,descripcion,creado_en,actualizado_en,cerrado_en,' +
  'categoria:categorias(id,nombre),' +
  'prioridad:prioridades(id,nombre,nivel),' +
  'estado:estados(id,nombre,es_final),' +
  'reportado_por:usuarios!tickets_usuario_id_fkey(id,nombre,email),' +
  'asignado:usuarios!tickets_asignado_a_fkey(id,nombre,email)'

const DETALLE_SELECT =
  '*,' +
  'categoria:categorias(*),' +
  'prioridad:prioridades(*),' +
  'estado:estados(*),' +
  'reportado_por:usuarios!tickets_usuario_id_fkey(id,nombre,email,empresa:empresas(id,nombre)),' +
  'asignado:usuarios!tickets_asignado_a_fkey(id,nombre,email),' +
  'comentarios(id,ticket_id,usuario_id,contenido,es_interno,creado_en,autor:usuarios(nombre,rol)),' +
  'adjuntos(id,ticket_id,comentario_id,nombre_archivo,ruta,tipo_mime,tamano_bytes,subido_en),' +
  'historial_tickets(id,ticket_id,usuario_id,campo,valor_anterior,valor_nuevo,fecha,usuario:usuarios(nombre))'

export function listarTickets(token: string): Promise<Ticket[]> {
  return api.get<Ticket[]>(`/tickets?select=${LISTA_SELECT}&order=creado_en.desc`, token)
}

export async function obtenerTicket(id: number, token: string): Promise<Ticket | null> {
  const filas = await api.get<Ticket[]>(`/tickets?id=eq.${id}&select=${DETALLE_SELECT}`, token)
  return filas[0] ?? null
}

export interface NuevoTicket {
  titulo: string
  descripcion: string
  usuario_id: number
  categoria_id: number
  prioridad_id: number
  estado_id: number
}

export function crearTicket(datos: NuevoTicket, token: string): Promise<Ticket[]> {
  return api.post<Ticket[]>('/tickets', datos, token)
}

export function actualizarTicket(
  id: number,
  cambios: Partial<Pick<Ticket, 'estado_id' | 'prioridad_id' | 'asignado_a' | 'categoria_id'>>,
  token: string
): Promise<Ticket[]> {
  return api.patch<Ticket[]>(`/tickets?id=eq.${id}`, cambios, token)
}

export function crearComentario(
  datos: { ticket_id: number; usuario_id: number; contenido: string; es_interno: boolean },
  token: string
): Promise<Comentario[]> {
  return api.post<Comentario[]>('/comentarios', datos, token)
}

export function agregarAdjunto(
  datos: {
    ticket_id: number
    comentario_id?: number | null
    nombre_archivo: string
    ruta: string
    tipo_mime?: string | null
  },
  token: string
) {
  return api.post('/adjuntos', datos, token)
}

export function listarCategorias(token: string): Promise<Categoria[]> {
  return api.get<Categoria[]>('/categorias?activa=eq.true&order=nombre.asc', token)
}

export function listarPrioridades(token: string): Promise<Prioridad[]> {
  return api.get<Prioridad[]>('/prioridades?order=nivel.asc', token)
}

export function listarEstados(token: string): Promise<Estado[]> {
  return api.get<Estado[]>('/estados?order=id.asc', token)
}

export function listarAgentes(token: string): Promise<Usuario[]> {
  return api.get<Usuario[]>('/usuarios?rol=eq.agente&activo=eq.true&order=nombre.asc', token)
}
