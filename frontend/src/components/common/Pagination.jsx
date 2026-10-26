import Icon from './Icon'

/** page is 0-based (Spring convention). */
export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null
  const btn = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-court disabled:opacity-40'
  const start = Math.max(0, Math.min(page - 2, totalPages - 5))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i)
  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button className={`${btn} border-slate-300 bg-white`} disabled={page <= 0} onClick={() => onChange(page - 1)} aria-label="Previous page"><Icon name="chevronLeft" className="h-4 w-4" /></button>
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}
          className={`${btn} ${p === page ? 'border-court bg-court text-white' : 'border-slate-300 bg-white text-navy'}`}>{p + 1}</button>
      ))}
      <button className={`${btn} border-slate-300 bg-white`} disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} aria-label="Next page"><Icon name="chevronRight" className="h-4 w-4" /></button>
    </nav>
  )
}
