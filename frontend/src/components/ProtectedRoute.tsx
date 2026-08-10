import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { cargando, autenticado } = useAuth()

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Cargando...
      </div>
    )
  }

  if (!autenticado) return <Navigate to="/login" replace />

  return <>{children}</>
}
