import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as cognito from '../lib/cognito'

type Modo = 'login' | 'olvide' | 'restablecer'

export function LoginPage() {
  const { iniciarSesion } = useAuth()
  const navigate = useNavigate()

  const [modo, setModo] = useState<Modo>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function resetMensajes() {
    setError(null)
    setMensaje(null)
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    resetMensajes()
    setEnviando(true)
    try {
      await iniciarSesion(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setEnviando(false)
    }
  }

  async function handleOlvide(e: FormEvent) {
    e.preventDefault()
    resetMensajes()
    setEnviando(true)
    try {
      await cognito.solicitarRecuperacion(email)
      setModo('restablecer')
      setMensaje('Te enviamos un código para restablecer tu contraseña.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud')
    } finally {
      setEnviando(false)
    }
  }

  async function handleRestablecer(e: FormEvent) {
    e.preventDefault()
    resetMensajes()
    setEnviando(true)
    try {
      await cognito.confirmarRecuperacion(email, codigo, nuevaPassword)
      setModo('login')
      setMensaje('Contraseña actualizada. Ya puedes iniciar sesión.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Sistema de Tickets</h1>
        <p className="mb-6 text-sm text-slate-500">{tituloPorModo(modo)}</p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {mensaje && (
          <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{mensaje}</p>
        )}

        {modo === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Campo label="Correo" type="email" value={email} onChange={setEmail} required />
            <Campo label="Contraseña" type="password" value={password} onChange={setPassword} required />
            <BotonEnviar enviando={enviando} texto="Iniciar sesión" />
            <div className="text-center text-sm">
              <button type="button" className="text-blue-600 hover:underline" onClick={() => { resetMensajes(); setModo('olvide') }}>
                Olvidé mi contraseña
              </button>
            </div>
            <p className="text-center text-xs text-slate-400">
              Las cuentas las crea un administrador o agente — no hay registro público.
            </p>
          </form>
        )}

        {modo === 'olvide' && (
          <form onSubmit={handleOlvide} className="space-y-4">
            <Campo label="Correo" type="email" value={email} onChange={setEmail} required />
            <BotonEnviar enviando={enviando} texto="Enviar código" />
            <VolverALogin onClick={() => { resetMensajes(); setModo('login') }} />
          </form>
        )}

        {modo === 'restablecer' && (
          <form onSubmit={handleRestablecer} className="space-y-4">
            <Campo label="Correo" type="email" value={email} onChange={setEmail} required />
            <Campo label="Código recibido" value={codigo} onChange={setCodigo} required />
            <Campo label="Nueva contraseña" type="password" value={nuevaPassword} onChange={setNuevaPassword} required />
            <BotonEnviar enviando={enviando} texto="Restablecer contraseña" />
            <VolverALogin onClick={() => { resetMensajes(); setModo('login') }} />
          </form>
        )}
      </div>
    </div>
  )
}

function tituloPorModo(modo: Modo): string {
  switch (modo) {
    case 'login':
      return 'Inicia sesión para continuar'
    case 'olvide':
      return 'Recupera tu contraseña'
    case 'restablecer':
      return 'Define tu nueva contraseña'
  }
}

function Campo({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </label>
  )
}

function BotonEnviar({ enviando, texto }: { enviando: boolean; texto: string }) {
  return (
    <button
      type="submit"
      disabled={enviando}
      className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {enviando ? 'Enviando...' : texto}
    </button>
  )
}

function VolverALogin({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="w-full text-center text-sm text-blue-600 hover:underline" onClick={onClick}>
      Volver a iniciar sesión
    </button>
  )
}
