import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listarTickets } from '../lib/tickets'
import { EstadoBadge, PrioridadBadge } from '../components/Badges'
import type { Ticket } from '../types'

export function TicketsListPage() {
  const { token, rol } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  useEffect(() => {
    if (!token) return
    listarTickets(token)
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar tickets'))
      .finally(() => setCargando(false))
  }, [token])

  const estadosDisponibles = useMemo(() => {
    const nombres = new Set(tickets.map((t) => t.estado?.nombre).filter((n): n is string => !!n))
    return Array.from(nombres)
  }, [tickets])

  const ticketsFiltrados =
    filtroEstado === 'todos' ? tickets : tickets.filter((t) => t.estado?.nombre === filtroEstado)

  if (cargando) return <p className="text-slate-500">Cargando tickets...</p>
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          {rol === 'cliente' ? 'Mis tickets' : 'Tickets'}
        </h1>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="todos">Todos los estados</option>
          {estadosDisponibles.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>
      </div>

      {ticketsFiltrados.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-slate-500">
          No hay tickets para mostrar.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Prioridad</th>
                <th className="px-4 py-2">Estado</th>
                {rol !== 'cliente' && <th className="px-4 py-2">Reportado por</th>}
                <th className="px-4 py-2">Asignado</th>
                <th className="px-4 py-2">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ticketsFiltrados.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/tickets/${t.id}`} className="font-medium text-blue-600 hover:underline">
                      {t.titulo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.categoria?.nombre}</td>
                  <td className="px-4 py-3">{t.prioridad && <PrioridadBadge nombre={t.prioridad.nombre} />}</td>
                  <td className="px-4 py-3">{t.estado && <EstadoBadge nombre={t.estado.nombre} />}</td>
                  {rol !== 'cliente' && (
                    <td className="px-4 py-3 text-slate-600">{t.reportado_por?.nombre}</td>
                  )}
                  <td className="px-4 py-3 text-slate-600">{t.asignado?.nombre ?? 'Sin asignar'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(t.creado_en).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
