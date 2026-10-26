import { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getBooking } from '../../services/api/bookings.api'
import { createPayment, getPaymentMethods } from '../../services/api/payments.api'
import useAsync from '../../hooks/useAsync'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'
import { ErrorState, PageSpinner } from '../../components/common/Feedback'
import { STATUS } from '../../config/endpoints'
import { dateLong, money, timeRange } from '../../utils/format'

// Used only when the backend does not expose a list of demo methods.
const DEFAULT_METHOD = { code: 'DEMO', label: 'Demo payment (no real money)' }

export default function Checkout() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const booking = useAsync((s) => getBooking(bookingId, s), [bookingId])
  const methods = useAsync((s) => getPaymentMethods(s), [])
  const [method, setMethod] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const inFlight = useRef(false)

  if (booking.loading && !booking.data) return <PageSpinner />
  if (booking.error) return <ErrorState error={booking.error} onRetry={booking.reload} />
  const b = booking.data
  if (STATUS.paymentSuccess.includes(b.paymentStatus)) return <Navigate to={`/bookings/${b.id}/confirmation`} replace />
  if (STATUS.bookingCancelled.includes(b.status)) return <ErrorState title="Booking cancelled" error="This booking was cancelled, so it can no longer be paid for." />

  const list = methods.data?.length ? methods.data : [DEFAULT_METHOD]
  const chosen = method || list[0].code

  const pay = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true); setError(null)
    try {
      const p = await createPayment({ bookingId: b.id, paymentMethod: chosen })
      if (STATUS.paymentFailed.includes(p?.status)) {
        setError({ message: p.message || 'The payment did not go through. You can try again.' })
      } else {
        // Success AND pending both go to the confirmation page, which re-reads real state from the server.
        navigate(`/bookings/${b.id}/confirmation`, { replace: true })
      }
    } catch (err) {
      setError(err)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Payment" subtitle="This is a demonstration. No real money is charged." />
      <div className="rounded-2xl bg-sky/60 p-5">
        <div className="flex items-center justify-between"><h2 className="font-bold">{b.facilityName || 'Your booking'}</h2><StatusBadge status={b.status} /></div>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Line k="Court" v={b.courtName || '—'} /><Line k="Date" v={dateLong(b.date)} /><Line k="Time" v={timeRange(b.startTime, b.endTime)} />
          <Line k="Amount due" v={money(b.totalAmount)} strong />
        </dl>
      </div>

      <fieldset className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-navy">Payment method</legend>
        {methods.error && <p className="mb-2 text-xs text-slate-500">Could not load payment methods; using the default demo method.</p>}
        {list.map((m) => (
          <label key={m.code} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-mint/50">
            <input type="radio" name="method" value={m.code} checked={chosen === m.code} onChange={() => setMethod(m.code)} className="h-4 w-4 accent-court" />
            <span className="text-sm font-medium">{m.label}</span>
          </label>
        ))}
        <p className="mt-2 text-xs text-slate-500">We never ask for card numbers, CVV, bank passwords or UPI PINs.</p>
      </fieldset>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
      <div className="mt-6 flex gap-3">
        <Button loading={busy} onClick={pay} size="lg">Pay {money(b.totalAmount)} (demo)</Button>
        <Button variant="ghost" size="lg" onClick={() => navigate('/my-bookings')}>Pay later</Button>
      </div>
    </div>
  )
}

const Line = ({ k, v, strong }) => (
  <div className="flex justify-between"><dt className="text-slate-600">{k}</dt><dd className={strong ? 'text-base font-bold text-navy' : 'font-medium text-navy'}>{v}</dd></div>
)
