export type Rol = 'admin' | 'agente' | 'cliente'

export interface Empresa {
  id: number
  nombre: string
  descripcion: string | null
  activa: boolean
  creado_en: string
}

export interface Usuario {
  id: number
  cognito_sub: string
  nombre: string
  email: string
  celular: string | null
  rol: Rol
  empresa_id: number | null
  activo: boolean
  creado_en: string
  empresa?: Pick<Empresa, 'id' | 'nombre'> | null
}

export interface Categoria {
  id: number
  nombre: string
  descripcion: string | null
  activa: boolean
}

export interface Prioridad {
  id: number
  nombre: string
  nivel: number
}

export interface Estado {
  id: number
  nombre: string
  es_final: boolean
}

export interface Comentario {
  id: number
  ticket_id: number
  usuario_id: number
  contenido: string
  es_interno: boolean
  creado_en: string
  autor?: Pick<Usuario, 'nombre' | 'rol'>
}

export interface Adjunto {
  id: number
  ticket_id: number
  comentario_id: number | null
  nombre_archivo: string
  ruta: string
  tipo_mime: string | null
  tamano_bytes: number | null
  subido_en: string
}

export interface HistorialTicket {
  id: number
  ticket_id: number
  usuario_id: number | null
  campo: string
  valor_anterior: string | null
  valor_nuevo: string | null
  fecha: string
  usuario?: Pick<Usuario, 'nombre'> | null
}

export interface Ticket {
  id: number
  titulo: string
  descripcion: string
  usuario_id: number
  creado_por_id: number
  asignado_a: number | null
  categoria_id: number
  prioridad_id: number
  estado_id: number
  creado_en: string
  actualizado_en: string
  cerrado_en: string | null
  categoria?: Categoria
  prioridad?: Prioridad
  estado?: Estado
  reportado_por?: Pick<Usuario, 'id' | 'nombre' | 'email'> & { empresa?: Pick<Empresa, 'id' | 'nombre'> | null }
  // presente solo cuando quien lo creó no es el dueño del ticket (un
  // agente lo registró a nombre de un cliente) — ver lib/tickets.ts
  creado_por?: Pick<Usuario, 'id' | 'nombre' | 'rol'> | null
  asignado?: Pick<Usuario, 'id' | 'nombre' | 'email'> | null
  comentarios?: Comentario[]
  adjuntos?: Adjunto[]
  historial_tickets?: HistorialTicket[]
}
