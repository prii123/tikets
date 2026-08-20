import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { crearTicket, listarCategorias, listarEstados, listarPrioridades } from '../lib/tickets'
import { listarClientesPorEmpresa, listarEmpresas } from '../lib/empresas'
import type { Categoria, Empresa, Estado, Prioridad, Usuario } from '../types'

export function NewTicketPage() {
  const { token, perfil, rol } = useAuth()
  const navigate = useNavigate()
  const puedeElegirCliente = rol === 'admin' || rol === 'agente'

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [prioridades, setPrioridades] = useState<Prioridad[]>([])
  const [estados, setEstados] = useState<Estado[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [clientes, setClientes] = useState<Usuario[]>([])

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [prioridadId, setPrioridadId] = useState<number | ''>('')
  const [empresaId, setEmpresaId] = useState<number | ''>('')
  const [clienteId, setClienteId] = useState<number | ''>('')
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

  useEffect(() => {
    if (!token || !puedeElegirCliente) return
    listarEmpresas(token).then(setEmpresas)
  }, [token, puedeElegirCliente])

  // al cambiar de empresa, se recarga la lista de clientes y se limpia
  // la selección anterior (pertenecía a otra empresa).
  useEffect(() => {
    if (!token || !puedeElegirCliente || !empresaId) {
      setClientes([])
      setClienteId('')
      return
    }
    listarClientesPorEmpresa(Number(empresaId), token).then(setClientes)
    setClienteId('')
  }, [token, puedeElegirCliente, empresaId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token || !perfil) return
    const estadoInicial = estados.find((e2) => e2.nombre === 'Abierto') ?? estados[0]
    if (!categoriaId || !prioridadId || !estadoInicial) {
      setError('Faltan catálogos por cargar, intenta de nuevo en un momento.')
      return
    }
    if (puedeElegirCliente && !clienteId) {
      setError('Selecciona la empresa y el cliente a nombre de quien es este ticket.')
      return
    }

    setEnviando(true)
    try {
      const [nuevo] = await crearTicket(
        {
          titulo,
          descripcion,
          usuario_id: puedeElegirCliente ? Number(clienteId) : perfil.id,
          creado_por_id: perfil.id,
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
        {puedeElegirCliente && (
          <div className="grid grid-cols-2 gap-4 rounded-md border border-blue-200 bg-blue-50 p-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Empresa</span>
              <select
                required
                value={empresaId}
                onChange={(e) => setEmpresaId(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Selecciona una empresa</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Cliente</span>
              <select
                required
                disabled={!empresaId}
                value={clienteId}
                onChange={(e) => setClienteId(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              >
                <option value="">{empresaId ? 'Selecciona un cliente' : 'Elige primero la empresa'}</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <p className="col-span-2 text-xs text-slate-500">
              El ticket queda a nombre de este cliente; va a quedar marcado que tú lo registraste.
            </p>
          </div>
        )}

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
