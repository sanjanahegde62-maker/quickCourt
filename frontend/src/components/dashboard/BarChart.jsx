/** Tiny dependency-free bar chart. data: [{ label, value }]. Renders only what it is given. */
export default function BarChart({ title, data, format = (v) => v }) {
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1)
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5">
      {title && <figcaption className="mb-4 text-sm font-semibold text-navy">{title}</figcaption>}
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.label} className="grid grid-cols-[6rem_1fr_4rem] items-center gap-3 text-xs">
            <span className="truncate text-slate-600" title={d.label}>{d.label}</span>
            <span className="h-3 overflow-hidden rounded-full bg-mint">
              <span className="block h-full rounded-full bg-court" style={{ width: `${((Number(d.value) || 0) / max) * 100}%` }} />
            </span>
            <span className="text-right font-semibold text-navy">{format(d.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
