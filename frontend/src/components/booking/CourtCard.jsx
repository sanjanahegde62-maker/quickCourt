import Button from '../common/Button'
import StatusBadge from '../common/Badge'
import { money, titleCase } from '../../utils/format'

export default function CourtCard({ court: c, onBook }) {
  const inactive = c.status && c.status !== 'ACTIVE'
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-sky/50 p-4">
      <div>
        <p className="font-semibold text-navy">{c.name}</p>
        <p className="text-sm text-slate-600">{titleCase(c.sportType)} · {money(c.pricePerHour)}/hr</p>
        {inactive && <StatusBadge status={c.status} className="mt-1" />}
      </div>
      <Button size="sm" disabled={inactive} onClick={() => onBook(c)}>Book Now</Button>
    </div>
  )
}
