import { useParams } from 'react-router-dom'
import { getBooking } from '../../services/api/bookings.api'
import { getPayment } from '../../services/api/payments.api'
import useAsync from '../../hooks/useAsync'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/Badge'
import Icon from '../../components/common/Icon'
import { ErrorState, PageSpinner } from '../../components/common/Feedback'
import { STATUS } from '../../config/endpoints'
import { dateLong, money, timeRange, titleCase } from '../../utils/format'

/** Everything here is read back from the server. Nothing is shown as confirmed on the client's say-so. */
export default function Confirmation() {
  const { bookingId } = useParams()
  const booking = useAsync((s) => getBooking(bookingId, s), [bookingId])
  const payment = useAsync((s) => getPayment(booking.data?.paymentId, s), [booking.data?.paymentId], { enabled: !!booking.data?.paymentId })

  if (booking.loading && !booking.data) return <PageSpinner label="Confirming with the server…" />
  if (booking.error) return <ErrorState error={booking.error} onRetry={booking.reload} />
  const b = booking.data
  const payStatus = payment.data?.status || b.paymentStatus
  const paid = STATUS.paymentSuccess.includes(payStatus)
  const pending = STATUS.paymentPending.includes(payStatus)
  const cancelled = STATUS.bookingCancelled.includes(b.status)

  const headline = cancelled ? 'This booking was cancelled' : paid ? 'Booking confirmed' : pending ? 'Payment pending' : 'Booking created, payment needed'
  const tone = cancelled || (!paid && !pending) ? 'bg-amber-100 text-amber-700' : 'bg-mint text-court'

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${tone}`}><Icon name={paid && !cancelled ? 'check' : 'clock'} className="h-7 w-7" /></span>
      <h1 className="mt-4 text-2xl font-bold">{headline}</h1>
      <dl className="mt-6 space-y-2.5 text-left text-sm">
        <Row k="Booking ID" v={b.reference ?? `#${b.id}`} />
        <Row k="Venue / court" v={[b.facilityName, b.courtName].filter(Boolean).join(' · ') || '—'} />
        <Row k="Sport" v={titleCase(b.sportType) || b.sportType || '—'} />
        <Row k="Date" v={dateLong(b.date)} />
        <Row k="Time" v={timeRange(b.startTime, b.endTime)} />
        <Row k="Duration" v={b.duration ? `${b.duration} mins` : '60 mins'} />
        <Row k="Total" v={money(b.totalAmount ?? payment.data?.amount)} strong />
        <div className="flex justify-between"><dt className="text-slate-600">Booking status</dt><dd><StatusBadge status={b.status} /></dd></div>
        <div className="flex justify-between"><dt className="text-slate-600">Payment status</dt><dd>{payStatus ? <StatusBadge status={payStatus} /> : '—'}</dd></div>
      </dl>
      <p className="mt-4 text-xs text-slate-500">🔒 Payment processed securely via Razorpay Payment Gateway.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {!paid && !cancelled && !pending && <Button to={`/checkout/${b.id}`}>Complete payment</Button>}
        <Button to="/my-bookings" variant="outline">My bookings</Button>
        <Button to="/venues" variant="ghost">Book another</Button>
      </div>
    </div>
  )
}

const Row = ({ k, v, strong }) => (
  <div className="flex justify-between gap-4"><dt className="text-slate-600">{k}</dt><dd className={strong ? 'font-bold text-navy' : 'font-medium text-navy'}>{v}</dd></div>
)
