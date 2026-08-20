import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  actualizarCategoria,
  actualizarPrioridad,
  crearCategoria,
  crearPrioridad,
  listarCategoriasAdmin,
  listarPrioridadesAdmin,
} from '../lib/catalogos'
import type { Categoria, Prioridad } from '../types'

export function AdminCatalogosPage() {
  const { token, rol } = useAuth()
  const [error, setError] = useState<string | null>(null)

  if (rol !== 'admin') {
    return <p className="text-slate-500">Solo un administrador puede gestionar categorías y prioridades.</p>
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-slate-900">Categorías y prioridades</h1>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <SeccionCategorias token={token} onError={setError} />
      <SeccionPrioridades token={token} onError={setError} />
    </div>
  )
}

function SeccionCategorias({ token, onError }: { token: string | null; onError: (m: string | null) => void }) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [creando, setCreando] = useState(false)

  function cargar() {
    if (!token) return
    setCargando(true)
    listarCategoriasAdmin(token)
      .then(setCategorias)
      .catch((err) => onError(err instanceof Error ? err.message : 'No se pudieron cargar las categorías'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token])

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    onError(null)
    setCreando(true)
    try {
      await crearCategoria({ nombre, descripcion: descripcion || null }, token)
      setNombre('')
      setDescripcion('')
      cargar()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo crear la categoría')
    } finally {
      setCreando(false)
    }
  }

  async function toggleActiva(cat: Categoria) {
    if (!token) return
    try {
      await actualizarCategoria(cat.id, { activa: !cat.activa }, token)
      cargar()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo actualizar la categoría')
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Categorías</h2>

      <form onSubmit={handleCrear} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <input
          required
          placeholder="Nombre de la categoría"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={creando}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {creando ? 'Creando...' : 'Crear categoría'}
        </button>
      </form>

      {cargando ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="hidden px-4 py-2 sm:table-cell">Descripción</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorias.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{cat.nombre}</td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{cat.descripcion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        cat.activa ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cat.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleActiva(cat)} className="text-xs text-blue-600 hover:underline">
                      {cat.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categorias.length === 0 && <p className="px-4 py-8 text-center text-slate-400">Aún no hay categorías.</p>}
        </div>
      )}
    </section>
  )
}

function SeccionPrioridades({ token, onError }: { token: string | null; onError: (m: string | null) => void }) {
  const [prioridades, setPrioridades] = useState<Prioridad[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [nivel, setNivel] = useState<number | ''>('')
  const [creando, setCreando] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editNivel, setEditNivel] = useState<number | ''>('')

  function cargar() {
    if (!token) return
    setCargando(true)
    listarPrioridadesAdmin(token)
      .then(setPrioridades)
      .catch((err) => onError(err instanceof Error ? err.message : 'No se pudieron cargar las prioridades'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token])

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    if (!token || nivel === '') return
    onError(null)
    setCreando(true)
    try {
      await crearPrioridad({ nombre, nivel: Number(nivel) }, token)
      setNombre('')
      setNivel('')
      cargar()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo crear la prioridad')
    } finally {
      setCreando(false)
    }
  }

  function iniciarEdicion(p: Prioridad) {
    setEditandoId(p.id)
    setEditNombre(p.nombre)
    setEditNivel(p.nivel)
  }

  async function guardarEdicion(id: number) {
    if (!token || editNivel === '') return
    onError(null)
    try {
      await actualizarPrioridad(id, { nombre: editNombre, nivel: Number(editNivel) }, token)
      setEditandoId(null)
      cargar()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo actualizar la prioridad')
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Prioridades</h2>
      <p className="text-xs text-slate-500">El nivel define el orden de urgencia: 1 es la más urgente.</p>

      <form onSubmit={handleCrear} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <input
          required
          placeholder="Nombre (ej. Alta)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          min={1}
          placeholder="Nivel (1 = más urgente)"
          value={nivel}
          onChange={(e) => setNivel(e.target.value === '' ? '' : Number(e.target.value))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={creando}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {creando ? 'Creando...' : 'Crear prioridad'}
        </button>
      </form>

      {cargando ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Nivel</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prioridades.map((p) =>
                editandoId === p.id ? (
                  <tr key={p.id} className="bg-slate-50">
                    <td className="px-4 py-2">
                      <input
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={1}
                        value={editNivel}
                        onChange={(e) => setEditNivel(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button onClick={() => guardarEdicion(p.id)} className="text-xs font-medium text-blue-600 hover:underline">
                        Guardar
                      </button>
                      <button onClick={() => setEditandoId(null)} className="text-xs text-slate-500 hover:underline">
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{p.nivel}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => iniciarEdicion(p)} className="text-xs text-blue-600 hover:underline">
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {prioridades.length === 0 && <p className="px-4 py-8 text-center text-slate-400">Aún no hay prioridades.</p>}
        </div>
      )}
    </section>
  )
}
