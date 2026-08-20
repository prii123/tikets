import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
  const location = useLocation()
  const puedeAdministrar = rol === 'admin' || rol === 'agente'
  const [menuAbierto, setMenuAbierto] = useState(false)

  // cierra el menú deslizable al navegar a otra ruta (celular)
  useEffect(() => {
    setMenuAbierto(false)
  }, [location.pathname])

  function handleLogout() {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen lg:flex">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-lg font-semibold text-slate-900">Sistema de Tickets</span>
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {menuAbierto && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:w-60 lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <NavLink to="/" className="text-lg font-semibold text-slate-900">
            Sistema de Tickets
          </NavLink>
          <button
            type="button"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
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
              {rol === 'admin' && (
                <NavLink to="/admin/catalogos" className={linkClase}>
                  Categorías y prioridades
                </NavLink>
              )}
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

      <main className="min-w-0 flex-1 overflow-x-auto px-4 py-4 sm:px-6 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
