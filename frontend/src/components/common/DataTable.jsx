/**
 * columns: [{ key, header, render?(row), className? }]
 * Horizontally scrollable on small screens.
 */
export default function DataTable({ columns, rows, rowKey = 'id', caption }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-lavender/70 text-xs uppercase tracking-wide text-navy">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={`px-4 py-3 font-semibold ${c.className || ''}`}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={r[rowKey] ?? i} className="hover:bg-sky/40">
              {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle text-slate-700 ${c.className || ''}`}>{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
