import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { actualizarEmpresa, crearEmpresa, listarEmpresas } from '../lib/empresas'
import type { Empresa } from '../types'

export function AdminEmpresasPage() {
  const { token, rol } = useAuth()
  const esAdmin = rol === 'admin'

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [creando, setCreando] = useState(false)

  function cargar() {
    if (!token) return
    setCargando(true)
    listarEmpresas(token)
      .then(setEmpresas)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las empresas'))
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token])

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setCreando(true)
    try {
      await crearEmpresa({ nombre, descripcion: descripcion || null }, token)
      setNombre('')
      setDescripcion('')
      cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la empresa')
    } finally {
      setCreando(false)
    }
  }

  async function toggleActiva(empresa: Empresa) {
    if (!token) return
    try {
      await actualizarEmpresa(empresa.id, { activa: !empresa.activa }, token)
      cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la empresa')
    }
  }

  if (cargando) return <p className="text-slate-500">Cargando empresas...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Empresas cliente</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {esAdmin && (
        <form onSubmit={handleCrear} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <input
            required
            placeholder="Nombre de la empresa"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            placeholder="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <button
            type="submit"
            disabled={creando}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {creando ? 'Creando...' : 'Crear empresa'}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Descripción</th>
              <th className="px-4 py-2">Estado</th>
              {esAdmin && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {empresas.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{emp.nombre}</td>
                <td className="px-4 py-3 text-slate-600">{emp.descripcion ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      emp.activa ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {emp.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                {esAdmin && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActiva(emp)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {emp.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {empresas.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-400">Aún no hay empresas registradas.</p>
        )}
      </div>
    </div>
  )
}
