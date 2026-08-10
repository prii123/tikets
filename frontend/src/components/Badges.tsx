const ESTADO_STYLES: Record<string, string> = {
  Abierto: 'bg-blue-100 text-blue-800',
  'En progreso': 'bg-amber-100 text-amber-800',
  'En espera del usuario': 'bg-violet-100 text-violet-800',
  Resuelto: 'bg-green-100 text-green-800',
  Cerrado: 'bg-slate-200 text-slate-700',
}

const PRIORIDAD_STYLES: Record<string, string> = {
  Crítica: 'bg-red-100 text-red-800',
  Alta: 'bg-orange-100 text-orange-800',
  Media: 'bg-yellow-100 text-yellow-800',
  Baja: 'bg-green-100 text-green-800',
}

function Badge({ texto, className }: { texto: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {texto}
    </span>
  )
}

export function EstadoBadge({ nombre }: { nombre: string }) {
  return <Badge texto={nombre} className={ESTADO_STYLES[nombre] ?? 'bg-slate-100 text-slate-700'} />
}

export function PrioridadBadge({ nombre }: { nombre: string }) {
  return <Badge texto={nombre} className={PRIORIDAD_STYLES[nombre] ?? 'bg-slate-100 text-slate-700'} />
}
