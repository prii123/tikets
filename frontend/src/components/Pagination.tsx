interface PaginationProps {
  pagina: number
  porPagina: number
  total: number
  onCambiar: (pagina: number) => void
}

export function Pagination({ pagina, porPagina, total, onCambiar }: PaginationProps) {
  if (total === 0) return null
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const hasta = Math.min(pagina * porPagina, total)

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      <span>
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">
          Página {pagina} de {totalPaginas}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onCambiar(pagina - 1)}
            disabled={pagina <= 1}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onCambiar(pagina + 1)}
            disabled={pagina >= totalPaginas}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
