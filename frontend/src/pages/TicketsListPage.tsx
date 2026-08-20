import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listarEstados, listarTicketsPagina } from '../lib/tickets'
import { EstadoBadge, PrioridadBadge } from '../components/Badges'
import { Pagination } from '../components/Pagination'
import { Stepper } from '../components/Stepper'
import type { Estado, Ticket } from '../types'

const POR_PAGINA = 15

type GrupoEstado = 'abiertos' | 'intermedios' | 'cerrados'

const PASOS: { clave: GrupoEstado; etiqueta: string }[] = [
  { clave: 'abiertos', etiqueta: 'Abiertos' },
  { clave: 'intermedios', etiqueta: 'En proceso' },
  { clave: 'cerrados', etiqueta: 'Cerrados' },
]

export function TicketsListPage() {
  const { token, rol } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [estados, setEstados] = useState<Estado[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grupoActivo, setGrupoActivo] = useState<GrupoEstado>('abiertos')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    if (!token) return
    listarEstados(token).then(setEstados)
  }, [token])

  // Agrupa los estados del catálogo en los 3 pasos del stepper:
  // "Abierto" es su propio grupo por nombre; "cerrados" es cualquier
  // estado marcado es_final; "intermedios" es todo lo demás (así, si
  // algún día se agrega un estado intermedio nuevo desde
  // /admin/catalogos, cae solo ahí sin tocar código).
  const gruposEstado = useMemo(() => {
    const abiertos = estados.filter((e) => e.nombre === 'Abierto').map((e) => e.id)
    const cerrados = estados.filter((e) => e.es_final).map((e) => e.id)
    const intermedios = estados.filter((e) => !e.es_final && e.nombre !== 'Abierto').map((e) => e.id)
    return { abiertos, intermedios, cerrados } satisfies Record<GrupoEstado, number[]>
  }, [estados])

  useEffect(() => {
    if (!token || estados.length === 0) return
    setCargando(true)
    listarTicketsPagina(pagina, POR_PAGINA, gruposEstado[grupoActivo], token)
      .then(({ datos, total: totalFilas }) => {
        setTickets(datos)
        setTotal(totalFilas)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar tickets'))
      .finally(() => setCargando(false))
  }, [token, pagina, grupoActivo, estados, gruposEstado])

  function cambiarGrupo(grupo: GrupoEstado) {
    // cambia grupo y vuelve a la página 1 en el MISMO evento (no en un
    // useEffect aparte): si no, el efecto de arriba podría disparar con
    // la página vieja y un grupo con menos tickets, pidiendo un offset
    // que ya no existe (PostgREST respondería 416).
    setGrupoActivo(grupo)
    setPagina(1)
  }

  return (
    <div>
      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        {rol === 'cliente' ? 'Mis tickets' : 'Tickets'}
      </h1>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <Stepper pasos={PASOS} activo={grupoActivo} onCambiar={cambiarGrupo} />
      </div>

      {cargando ? (
        <p className="text-slate-500">Cargando tickets...</p>
      ) : tickets.length === 0 ? (
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
              {tickets.map((t) => (
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
          <Pagination pagina={pagina} porPagina={POR_PAGINA} total={total} onCambiar={setPagina} />
        </div>
      )}
    </div>
  )
}
