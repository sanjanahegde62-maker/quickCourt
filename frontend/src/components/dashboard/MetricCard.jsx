import Icon from '../common/Icon'

export default function MetricCard({ label, value, icon = 'chart', tone = 'bg-sky' }) {
  return (
    <div className={`rounded-2xl ${tone} p-5`}>
      <div className="flex items-center justify-between text-navy/70">
        <span className="text-sm font-medium">{label}</span>
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <p className="mt-2 text-3xl font-bold text-navy">{value}</p>
    </div>
  )
}
