export const money = (v) =>
  v === undefined || v === null || v === '' || Number.isNaN(Number(v))
    ? '—'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v))

export const timeShort = (t) => (t ? String(t).slice(0, 5) : '')

export const timeRange = (s, e) => (s || e ? `${timeShort(s)} – ${timeShort(e)}` : '—')

export const dateLong = (d) => {
  if (!d) return '—'
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return Number.isNaN(dt.getTime())
    ? String(d)
    : dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export const dateTime = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export const todayISO = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const titleCase = (s) =>
  s ? String(s).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''
