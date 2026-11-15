import { useLocation, useParams } from 'react-router-dom'
import { getBooking } from '../../services/api/bookings.api'
import { getPayment } from '../../services/api/payments.api'
import useAsync from '../../hooks/useAsync'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/Badge'
import Icon from '../../components/common/Icon'
import { ErrorState, PageSpinner } from '../../components/common/Feedback'
import { STATUS } from '../../config/endpoints'
import { dateLong, money, timeRange, titleCase } from '../../utils/format'

/** Everything here is read back authoritatively from the server. */
export default function Confirmation() {
  const { bookingId } = useParams()
  const location = useLocation()
  const passedPayment = location.state?.payment

  const booking = useAsync((s) => getBooking(bookingId, s), [bookingId])
  const payment = useAsync(
    (s) => getPayment(booking.data?.paymentId, s),
    [booking.data?.paymentId],
    { enabled: !!booking.data?.paymentId }
  )

  if (booking.loading && !booking.data) return <PageSpinner label="Confirming booking details with server…" />
  if (booking.error) return <ErrorState error={booking.error} onRetry={booking.reload} />

  const b = booking.data
  const payStatus = payment.data?.status || passedPayment?.status || b.paymentStatus
  const paid = STATUS.paymentSuccess.includes(payStatus) || b.status === 'CONFIRMED'
  const pending = STATUS.paymentPending.includes(payStatus) && b.status !== 'CONFIRMED'
  const cancelled = STATUS.bookingCancelled.includes(b.status)

  const isDemo =
    b.paymentMethod?.includes('DEMO') ||
    b.transactionId?.startsWith('SIM_TXN') ||
    passedPayment?.transactionId?.startsWith('SIM_TXN') ||
    payment.data?.paymentMethod?.includes('DEMO')

  const transactionId =
    b.transactionId ||
    passedPayment?.transactionId ||
    payment.data?.transactionId ||
    (isDemo ? 'SIM_TXN_CONFIRMED' : '—')

  const methodDisplay = () => {
    const raw = b.paymentMethod || passedPayment?.paymentMethod || payment.data?.paymentMethod || ''
    if (raw.includes('UPI')) return 'Demo UPI / Instant Pay'
    if (raw.includes('CARD')) return 'Demo Debit / Credit Card'
    if (raw.includes('NETBANKING') || raw.includes('NET_BANKING')) return 'Demo Net Banking'
    if (raw.includes('DEMO')) return 'Demo Payment Gateway'
    return raw || 'Simulated Payment'
  }

  const headline = cancelled
    ? 'This booking was cancelled'
    : paid
    ? 'Booking Confirmed!'
    : pending
    ? 'Payment Pending'
    : 'Booking Created, Payment Needed'

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span
          className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
            cancelled ? 'bg-amber-100 text-amber-700' : paid ? 'bg-emerald-100 text-emerald-700' : 'bg-sky text-blue-700'
          }`}
        >
          <Icon name={paid && !cancelled ? 'check' : cancelled ? 'x' : 'clock'} className="h-8 w-8" />
        </span>

        <h1 className="mt-4 text-2xl font-extrabold text-navy">{headline}</h1>
        {paid && !cancelled && (
          <p className="mt-1 text-sm font-medium text-emerald-700">
            Payment Successful! Your court is locked and confirmed.
          </p>
        )}

        {/* Demo Payment Indicator Badge */}
        {isDemo && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            <span>🛡️</span>
            <span>Demo Payment System — No Real Money Charged</span>
          </div>
        )}

        <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-left text-sm">
          <Row k="Booking ID" v={b.reference ?? `#${b.id}`} />
          <Row k="Transaction ID" v={<span className="font-mono text-xs">{transactionId}</span>} />
          <Row
            k="Venue & Court"
            v={[b.facilityName || b.venueName, b.courtName].filter(Boolean).join(' · ') || '—'}
          />
          <Row k="Sport" v={titleCase(b.sportType || b.sport) || '—'} />
          <Row k="Date" v={dateLong(b.date || b.bookingDate)} />
          <Row k="Time Slot" v={timeRange(b.startTime, b.endTime)} />
          <Row k="Duration" v={b.duration ? `${b.duration} mins` : '60 mins'} />
          <Row k="Amount Paid" v={money(b.totalAmount ?? payment.data?.amount ?? b.totalPrice)} strong />
          <Row k="Payment Method" v={methodDisplay()} />
          <div className="flex items-center justify-between py-2">
            <dt className="text-slate-600">Booking Status</dt>
            <dd>
              <StatusBadge status={b.status} />
            </dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-slate-600">Payment Status</dt>
            <dd>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                SUCCESS (DEMO)
              </span>
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-slate-500">
          QuickCourt Demo Payment System • Authoritative backend confirmation • Slot permanently reserved.
        </p>

        {/* Navigation Action Buttons as specified */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button to="/my-bookings" className="font-semibold shadow-xs">
            View My Bookings
          </Button>
          <Button to="/player" variant="outline" className="font-semibold">
            Go to Dashboard
          </Button>
          <Button to="/venues" variant="ghost" className="font-medium text-slate-600">
            Book Another Court
          </Button>
        </div>
      </div>
    </div>
  )
}

const Row = ({ k, v, strong }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <dt className="text-slate-600">{k}</dt>
    <dd className={strong ? 'text-base font-bold text-navy' : 'font-medium text-navy text-right'}>{v}</dd>
  </div>
)
