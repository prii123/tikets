import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { crearTicket, listarCategorias, listarEstados, listarPrioridades } from '../lib/tickets'
import type { Categoria, Estado, Prioridad } from '../types'

export function NewTicketPage() {
  const { token, perfil } = useAuth()
  const navigate = useNavigate()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [prioridades, setPrioridades] = useState<Prioridad[]>([])
  const [estados, setEstados] = useState<Estado[]>([])

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [prioridadId, setPrioridadId] = useState<number | ''>('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    Promise.all([listarCategorias(token), listarPrioridades(token), listarEstados(token)]).then(
      ([cats, prios, ests]) => {
        setCategorias(cats)
        setPrioridades(prios)
        setEstados(ests)
        if (cats[0]) setCategoriaId(cats[0].id)
        const media = prios.find((p) => p.nombre === 'Media') ?? prios[0]
        if (media) setPrioridadId(media.id)
      }
    )
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token || !perfil) return
    const estadoInicial = estados.find((e2) => e2.nombre === 'Abierto') ?? estados[0]
    if (!categoriaId || !prioridadId || !estadoInicial) {
      setError('Faltan catálogos por cargar, intenta de nuevo en un momento.')
      return
    }

    setEnviando(true)
    try {
      const [nuevo] = await crearTicket(
        {
          titulo,
          descripcion,
          usuario_id: perfil.id,
          categoria_id: categoriaId,
          prioridad_id: prioridadId,
          estado_id: estadoInicial.id,
        },
        token
      )
      navigate(`/tickets/${nuevo.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el ticket')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Nuevo ticket</h1>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Título</span>
          <input
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Descripción</span>
          <textarea
            required
            rows={5}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Categoría</span>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Prioridad</span>
            <select
              value={prioridadId}
              onChange={(e) => setPrioridadId(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {prioridades.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {enviando ? 'Creando...' : 'Crear ticket'}
        </button>
      </form>
    </div>
  )
}
