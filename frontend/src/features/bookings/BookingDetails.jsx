import { useParams } from 'react-router-dom'
import { getBooking } from '../../services/api/bookings.api'
import useAsync from '../../hooks/useAsync'
import useCancel from './useCancel'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'
import { ErrorState, PageSpinner } from '../../components/common/Feedback'
import { isCancellable } from '../../services/adapters'
import { STATUS } from '../../config/endpoints'
import { dateLong, dateTime, money, timeRange, titleCase } from '../../utils/format'

export default function BookingDetails() {
  const { bookingId } = useParams()
  const state = useAsync((s) => getBooking(bookingId, s), [bookingId])
  const { askCancel, dialog } = useCancel(state.reload)

  if (state.loading && !state.data) return <PageSpinner />
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />
  const b = state.data
  const needsPayment = !STATUS.paymentSuccess.includes(b.paymentStatus) && !STATUS.bookingCancelled.includes(b.status)

  const rows = [
    ['Booking reference', b.reference ?? b.id],
    ['Venue', b.facilityName || '—'],
    ['Court', b.courtName || '—'],
    ['Sport', titleCase(b.sportType) || b.sportType || '—'],
    ['Date', dateLong(b.date)],
    ['Time', timeRange(b.startTime, b.endTime)],
    ['Duration', b.duration ? `${b.duration} mins` : '60 mins'],
    ['Amount', money(b.totalAmount)],
    ['Booked on', dateTime(b.createdAt)],
  ]
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Booking details" />
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <dl className="space-y-3 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-slate-600">{k}</dt>
              <dd className="font-medium text-navy">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between">
            <dt className="text-slate-600">Booking status</dt>
            <dd><StatusBadge status={b.status} /></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Payment status</dt>
            <dd>{b.paymentStatus ? <StatusBadge status={b.paymentStatus} /> : '—'}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          {needsPayment && <Button to={`/checkout/${b.id}`}>Pay now with Razorpay</Button>}
          {isCancellable(b) && <Button variant="danger" onClick={() => askCancel(b)}>Cancel booking</Button>}
          <Button to="/my-bookings" variant="outline">Back to bookings</Button>
        </div>
      </div>
      {dialog}
    </div>
  )
}
