import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  agente: 'Agente de soporte',
  cliente: 'Cliente',
}

export function Layout() {
  const { perfil, rol, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            Sistema de Tickets
          </Link>
          <div className="flex items-center gap-4">
            {(rol === 'admin' || rol === 'agente') && (
              <>
                <Link to="/admin/usuarios" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Usuarios
                </Link>
                <Link to="/admin/empresas" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Empresas
                </Link>
              </>
            )}
            <Link to="/tickets/nuevo" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              + Nuevo ticket
            </Link>
            <div className="text-right text-sm">
              <p className="font-medium text-slate-900">{perfil?.nombre ?? '...'}</p>
              <p className="text-slate-500">{rol ? ROL_LABEL[rol] ?? rol : ''}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
