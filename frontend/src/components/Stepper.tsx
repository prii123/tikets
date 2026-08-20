interface Paso<T extends string> {
  clave: T
  etiqueta: string
}

interface StepperProps<T extends string> {
  pasos: Paso<T>[]
  activo: T
  onCambiar: (clave: T) => void
}

// Tabs con estilo de wizard (círculos numerados unidos por una línea),
// pero funcionan como filtro/selector simple, no como un formulario
// secuencial con validación paso a paso.
export function Stepper<T extends string>({ pasos, activo, onCambiar }: StepperProps<T>) {
  return (
    <div className="flex items-center">
      {pasos.map((paso, i) => {
        const esActivo = paso.clave === activo
        const esUltimo = i === pasos.length - 1
        return (
          <div key={paso.clave} className={`flex items-center ${esUltimo ? '' : 'flex-1'}`}>
            <button
              type="button"
              onClick={() => onCambiar(paso.clave)}
              className="flex flex-shrink-0 items-center gap-2"
            >
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  esActivo ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-xs font-medium sm:text-sm ${esActivo ? 'text-blue-700' : 'text-slate-500'}`}
              >
                {paso.etiqueta}
              </span>
            </button>
            {!esUltimo && <div className="mx-2 h-px flex-1 bg-slate-200 sm:mx-3" />}
          </div>
        )
      })}
    </div>
  )
}
