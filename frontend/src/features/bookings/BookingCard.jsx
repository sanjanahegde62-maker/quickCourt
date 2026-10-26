import StatusBadge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { dateLong, money, timeRange } from '../../utils/format'
import { isCancellable } from '../../services/adapters'

export default function BookingCard({ booking: b, onCancel }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">Ref #{b.reference ?? b.id}</p>
        <h3 className="truncate text-base font-bold text-navy">{[b.facilityName, b.courtName].filter(Boolean).join(' · ') || `Booking ${b.id}`}</h3>
        <p className="text-sm text-slate-600">{dateLong(b.date)} · {timeRange(b.startTime, b.endTime)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={b.status} />
          {b.paymentStatus && <span className="text-xs text-slate-500">Payment:</span>}
          <StatusBadge status={b.paymentStatus} />
          <span className="ml-1 text-sm font-semibold text-navy">{money(b.totalAmount)}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button to={`/bookings/${b.id}`} variant="outline" size="sm">View Details</Button>
        {onCancel && isCancellable(b) && <Button variant="ghost" size="sm" onClick={() => onCancel(b)}>Cancel</Button>}
      </div>
    </article>
  )
}
