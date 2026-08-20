import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { crearUsuario, listarUsuariosPagina } from '../lib/admin'
import { listarEmpresas } from '../lib/empresas'
import { Pagination } from '../components/Pagination'
import type { Empresa, Rol, Usuario } from '../types'

const ROL_LABEL: Record<Rol, string> = { admin: 'Administrador', agente: 'Agente', cliente: 'Cliente' }
const POR_PAGINA = 10

export function AdminUsuariosPage() {
  const { token, rol: rolPropio } = useAuth()
  const esAdmin = rolPropio === 'admin'

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [celular, setCelular] = useState('')
  const [rol, setRol] = useState<Rol>('cliente')
  const [empresaId, setEmpresaId] = useState<number | ''>('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ email: string; passwordTemporal: string } | null>(null)

  // el selector de empresa del formulario necesita la lista completa (no
  // paginada); solo se carga una vez.
  useEffect(() => {
    if (!token) return
    listarEmpresas(token).then(setEmpresas)
  }, [token])

  function cargar() {
    if (!token) return
    setCargando(true)
    listarUsuariosPagina(pagina, POR_PAGINA, token)
      .then(({ datos, total: totalFilas }) => {
        setUsuarios(datos)
        setTotal(totalFilas)
      })
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [token, pagina])

  // un agente solo puede crear clientes; si no es admin, el selector de
  // rol queda fijo en "cliente" (coincide con lo que valida la Lambda y RLS).
  useEffect(() => {
    if (!esAdmin) setRol('cliente')
  }, [esAdmin])

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setResultado(null)

    if (rol === 'cliente' && !empresaId) {
      setError('Selecciona la empresa del nuevo usuario.')
      return
    }

    setEnviando(true)
    try {
      const { passwordTemporal } = await crearUsuario(
        {
          nombre,
          email,
          celular: celular || undefined,
          rol,
          empresa_id: rol === 'cliente' ? Number(empresaId) : null,
        },
        token
      )
      setResultado({ email, passwordTemporal })
      setNombre('')
      setEmail('')
      setCelular('')
      setEmpresaId('')
      cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario')
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) return <p className="text-slate-500">Cargando...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Usuarios</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {resultado && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">Cuenta creada para {resultado.email}</p>
          <p>
            Contraseña temporal: <code className="rounded bg-white px-1.5 py-0.5">{resultado.passwordTemporal}</code>
          </p>
          <p className="mt-1 text-xs text-green-700">
            Compártela por otro medio (WhatsApp, en persona, etc.) — no se envía correo automático.
          </p>
        </div>
      )}

      <form onSubmit={handleCrear} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</span>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Correo</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Celular (opcional)</span>
            <input
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="+52..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Rol</span>
            {esAdmin ? (
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as Rol)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="cliente">Cliente</option>
                <option value="agente">Agente</option>
                <option value="admin">Administrador</option>
              </select>
            ) : (
              <input disabled value="Cliente" className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
            )}
          </label>

          {rol === 'cliente' && (
            <label className="block sm:col-span-2">
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
          )}
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {enviando ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="hidden px-4 py-2 sm:table-cell">Correo</th>
              <th className="px-4 py-2">Rol</th>
              <th className="hidden px-4 py-2 md:table-cell">Empresa</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{u.nombre}</td>
                <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{ROL_LABEL[u.rol]}</td>
                <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{u.empresa?.nombre ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{u.activo ? 'Activo' : 'Inactivo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuarios.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-400">Aún no hay usuarios registrados.</p>
        )}
        <Pagination pagina={pagina} porPagina={POR_PAGINA} total={total} onCambiar={setPagina} />
      </div>
    </div>
  )
}
