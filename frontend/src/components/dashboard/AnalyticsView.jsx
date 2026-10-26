import MetricCard from './MetricCard'
import BarChart from './BarChart'
import DataTable from '../common/DataTable'
import { EmptyState } from '../common/Feedback'
import { money, titleCase } from '../../utils/format'

const LABEL_KEYS = ['label', 'date', 'name', 'facilityName', 'courtName', 'status', 'month', 'day', 'sport']
const TONES = ['bg-mint', 'bg-sky', 'bg-lavender', 'bg-white']
const isMoneyKey = (k) => /earn|revenue|amount|income|price/i.test(k)
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

const fmt = (key, v) => (isMoneyKey(key) ? money(v) : Number.isInteger(v) ? v.toLocaleString('en-IN') : v)

/**
 * Renders WHATEVER numeric data the analytics endpoint returns, without inventing any:
 *  - top-level numbers            -> metric cards
 *  - { A: 3, B: 5 } style objects -> bar chart
 *  - [{label, count}, ...] arrays -> bar chart + table
 * Update once the real analytics DTO is known if you want tailored charts.
 */
export default function AnalyticsView({ data }) {
  if (!data || typeof data !== 'object') return <EmptyState icon="chart" title="No analytics available" />
  const cards = Object.entries(data).filter(([, v]) => isNum(v))
  const maps = Object.entries(data).filter(([, v]) => v && !Array.isArray(v) && typeof v === 'object' && Object.values(v).length && Object.values(v).every(isNum))
  const lists = Object.entries(data).filter(([, v]) => Array.isArray(v) && v.length && typeof v[0] === 'object')

  if (!cards.length && !maps.length && !lists.length) return <EmptyState icon="chart" title="No analytics available yet" message="The server returned no numeric statistics." />

  return (
    <div className="space-y-6">
      {cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([k, v], i) => <MetricCard key={k} label={titleCase(k.replace(/([A-Z])/g, ' $1'))} value={fmt(k, v)} tone={TONES[i % TONES.length]} />)}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {maps.map(([k, obj]) => (
          <BarChart key={k} title={titleCase(k.replace(/([A-Z])/g, ' $1'))} data={Object.entries(obj).map(([label, value]) => ({ label: titleCase(label), value }))} format={(v) => fmt(k, v)} />
        ))}
        {lists.map(([k, rows]) => {
          const first = rows[0]
          const labelKey = LABEL_KEYS.find((x) => x in first) || Object.keys(first).find((x) => !isNum(first[x])) || Object.keys(first)[0]
          const valueKey = Object.keys(first).find((x) => x !== labelKey && isNum(first[x]))
          const title = titleCase(k.replace(/([A-Z])/g, ' $1'))
          return valueKey ? (
            <BarChart key={k} title={title} data={rows.map((r) => ({ label: String(r[labelKey]), value: r[valueKey] }))} format={(v) => fmt(valueKey, v)} />
          ) : (
            <div key={k}><h3 className="mb-2 text-sm font-semibold text-navy">{title}</h3>
              <DataTable rowKey={labelKey} columns={Object.keys(first).map((c) => ({ key: c, header: titleCase(c) }))} rows={rows} /></div>
          )
        })}
      </div>
      {lists.length > 0 && (
        <div className="space-y-6">
          {lists.map(([k, rows]) => (
            <div key={`t-${k}`}>
              <h3 className="mb-2 text-sm font-semibold text-navy">{titleCase(k.replace(/([A-Z])/g, ' $1'))} (table)</h3>
              <DataTable rowKey="__i" columns={Object.keys(rows[0]).map((c) => ({ key: c, header: titleCase(c.replace(/([A-Z])/g, ' $1')), render: (r) => (isNum(r[c]) ? fmt(c, r[c]) : String(r[c] ?? '—')) }))}
                rows={rows.map((r, i) => ({ ...r, __i: i }))} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
