import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  agente: 'Agente de soporte',
  cliente: 'Cliente',
}

function linkClase({ isActive }: { isActive: boolean }) {
  return `block rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`
}

export function Layout() {
  const { perfil, rol, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const puedeAdministrar = rol === 'admin' || rol === 'agente'

  function handleLogout() {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <NavLink to="/" className="text-lg font-semibold text-slate-900">
            Sistema de Tickets
          </NavLink>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavLink to="/" end className={linkClase}>
            Tickets
          </NavLink>
          <NavLink to="/tickets/nuevo" className={linkClase}>
            + Nuevo ticket
          </NavLink>

          {puedeAdministrar && (
            <>
              <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Administración
              </p>
              <NavLink to="/admin/usuarios" className={linkClase}>
                Usuarios
              </NavLink>
              <NavLink to="/admin/empresas" className={linkClase}>
                Empresas
              </NavLink>
            </>
          )}
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <p className="truncate text-sm font-medium text-slate-900">{perfil?.nombre ?? '...'}</p>
          <p className="text-xs text-slate-500">{rol ? ROL_LABEL[rol] ?? rol : ''}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Salir
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
