import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  actualizarTicket,
  agregarAdjunto,
  crearComentario,
  listarAgentes,
  listarEstados,
  listarPrioridades,
  obtenerTicket,
} from '../lib/tickets'
import { EstadoBadge, PrioridadBadge } from '../components/Badges'
import type { Estado, Prioridad, Ticket, Usuario } from '../types'

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = Number(id)
  const { token, perfil, rol } = useAuth()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [estados, setEstados] = useState<Estado[]>([])
  const [prioridades, setPrioridades] = useState<Prioridad[]>([])
  const [agentes, setAgentes] = useState<Usuario[]>([])

  const [nuevoComentario, setNuevoComentario] = useState('')
  const [esInterno, setEsInterno] = useState(false)
  const [enviandoComentario, setEnviandoComentario] = useState(false)

  const [nombreAdjunto, setNombreAdjunto] = useState('')
  const [urlAdjunto, setUrlAdjunto] = useState('')
  const [enviandoAdjunto, setEnviandoAdjunto] = useState(false)

  const puedeGestionar = rol === 'admin' || rol === 'agente'

  const cargar = useCallback(async () => {
    if (!token) return
    setCargando(true)
    try {
      const t = await obtenerTicket(ticketId, token)
      setTicket(t)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el ticket')
    } finally {
      setCargando(false)
    }
  }, [ticketId, token])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (!token || !puedeGestionar) return
    listarEstados(token).then(setEstados)
    listarPrioridades(token).then(setPrioridades)
    listarAgentes(token).then(setAgentes)
  }, [token, puedeGestionar])

  async function handleCambio(campo: 'estado_id' | 'prioridad_id' | 'asignado_a', valor: number | null) {
    if (!token) return
    try {
      await actualizarTicket(ticketId, { [campo]: valor }, token)
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el ticket')
    }
  }

  async function handleComentario(e: FormEvent) {
    e.preventDefault()
    if (!token || !perfil || !nuevoComentario.trim()) return
    setEnviandoComentario(true)
    try {
      await crearComentario(
        { ticket_id: ticketId, usuario_id: perfil.id, contenido: nuevoComentario, es_interno: esInterno },
        token
      )
      setNuevoComentario('')
      setEsInterno(false)
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el comentario')
    } finally {
      setEnviandoComentario(false)
    }
  }

  async function handleAdjunto(e: FormEvent) {
    e.preventDefault()
    if (!token || !nombreAdjunto.trim() || !urlAdjunto.trim()) return
    setEnviandoAdjunto(true)
    try {
      await agregarAdjunto(
        { ticket_id: ticketId, nombre_archivo: nombreAdjunto, ruta: urlAdjunto },
        token
      )
      setNombreAdjunto('')
      setUrlAdjunto('')
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el adjunto')
    } finally {
      setEnviandoAdjunto(false)
    }
  }

  if (cargando) return <p className="text-slate-500">Cargando ticket...</p>
  if (error && !ticket) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
  if (!ticket) return <p className="text-slate-500">No se encontró el ticket.</p>

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-blue-600 hover:underline">
        &larr; Volver a la lista
      </Link>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {ticket.estado && <EstadoBadge nombre={ticket.estado.nombre} />}
          {ticket.prioridad && <PrioridadBadge nombre={ticket.prioridad.nombre} />}
          <span className="text-xs text-slate-500">Ticket #{ticket.id}</span>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-slate-900">{ticket.titulo}</h1>
        <p className="mb-4 whitespace-pre-wrap text-slate-700">{ticket.descripcion}</p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <dt className="text-slate-400">Categoría</dt>
            <dd>{ticket.categoria?.nombre}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Reportado por</dt>
            <dd>{ticket.reportado_por?.nombre}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Asignado a</dt>
            <dd>{ticket.asignado?.nombre ?? 'Sin asignar'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Creado</dt>
            <dd>{new Date(ticket.creado_en).toLocaleString('es-MX')}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Última actualización</dt>
            <dd>{new Date(ticket.actualizado_en).toLocaleString('es-MX')}</dd>
          </div>
          {ticket.cerrado_en && (
            <div>
              <dt className="text-slate-400">Cerrado</dt>
              <dd>{new Date(ticket.cerrado_en).toLocaleString('es-MX')}</dd>
            </div>
          )}
        </dl>
      </div>

      {puedeGestionar && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Gestión del ticket</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Estado</span>
              <select
                value={ticket.estado_id}
                onChange={(e) => handleCambio('estado_id', Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {estados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Prioridad</span>
              <select
                value={ticket.prioridad_id}
                onChange={(e) => handleCambio('prioridad_id', Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {prioridades.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Asignado a</span>
              <select
                value={ticket.asignado_a ?? ''}
                onChange={(e) => handleCambio('asignado_a', e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Sin asignar</option>
                {agentes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Comentarios</h2>
        <div className="space-y-3">
          {(ticket.comentarios ?? [])
            .slice()
            .sort((a, b) => a.creado_en.localeCompare(b.creado_en))
            .map((c) => (
              <div
                key={c.id}
                className={`rounded-md border p-3 text-sm ${
                  c.es_interno ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{c.autor?.nombre ?? 'Usuario'}</span>
                  <span>{new Date(c.creado_en).toLocaleString('es-MX')}</span>
                </div>
                {c.es_interno && <p className="mb-1 text-xs font-medium text-amber-700">Nota interna</p>}
                <p className="whitespace-pre-wrap text-slate-700">{c.contenido}</p>
              </div>
            ))}
          {(ticket.comentarios ?? []).length === 0 && (
            <p className="text-sm text-slate-400">Aún no hay comentarios.</p>
          )}
        </div>

        <form onSubmit={handleComentario} className="mt-4 space-y-2">
          <textarea
            required
            rows={3}
            placeholder="Escribe un comentario..."
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex items-center justify-between">
            {puedeGestionar ? (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={esInterno} onChange={(e) => setEsInterno(e.target.checked)} />
                Nota interna (no visible para el cliente)
              </label>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={enviandoComentario}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {enviandoComentario ? 'Enviando...' : 'Comentar'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Adjuntos</h2>
        <ul className="mb-4 space-y-1 text-sm">
          {(ticket.adjuntos ?? []).map((a) => (
            <li key={a.id}>
              <a href={a.ruta} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                {a.nombre_archivo}
              </a>
            </li>
          ))}
          {(ticket.adjuntos ?? []).length === 0 && <p className="text-slate-400">Sin adjuntos.</p>}
        </ul>

        <form onSubmit={handleAdjunto} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            placeholder="Nombre del archivo"
            value={nombreAdjunto}
            onChange={(e) => setNombreAdjunto(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-1"
          />
          <input
            placeholder="URL del archivo"
            value={urlAdjunto}
            onChange={(e) => setUrlAdjunto(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-1"
          />
          <button
            type="submit"
            disabled={enviandoAdjunto}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {enviandoAdjunto ? 'Agregando...' : 'Agregar enlace'}
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Por ahora los adjuntos son enlaces (ej. a un archivo ya subido a S3/Drive). Subida directa de
          archivos queda pendiente.
        </p>
      </div>

      {(ticket.historial_tickets ?? []).length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Historial</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {(ticket.historial_tickets ?? [])
              .slice()
              .sort((a, b) => b.fecha.localeCompare(a.fecha))
              .map((h) => (
                <li key={h.id} className="border-l-2 border-slate-200 pl-3">
                  <span className="font-medium text-slate-800">{h.usuario?.nombre ?? 'Sistema'}</span> cambió{' '}
                  <span className="font-medium">{h.campo}</span> de{' '}
                  <span className="text-slate-500">{h.valor_anterior ?? '—'}</span> a{' '}
                  <span className="text-slate-500">{h.valor_nuevo ?? '—'}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {new Date(h.fecha).toLocaleString('es-MX')}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
