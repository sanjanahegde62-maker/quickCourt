import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getBooking, releaseBookingHold } from '../../services/api/bookings.api'
import { createRazorpayOrder, getPaymentConfig, verifyRazorpayPayment } from '../../services/api/payments.api'
import useAsync from '../../hooks/useAsync'
import { useAuth } from '../../auth/AuthProvider'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'
import { ErrorState, PageSpinner } from '../../components/common/Feedback'
import { useToast } from '../../components/common/Toast'
import { STATUS } from '../../config/endpoints'
import { dateLong, money, timeRange, titleCase } from '../../utils/format'

/** Helper to dynamically load the Razorpay checkout script */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function StepIndicator({ currentStep = 4 }) {
  const steps = [
    { number: 1, label: 'Select Date' },
    { number: 2, label: 'Choose Slot' },
    { number: 3, label: 'Review Details' },
    { number: 4, label: 'Secure Payment' },
  ]
  return (
    <div className="mb-6 rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        {steps.map((st, i) => {
          const isDone = st.number < currentStep
          const isCurrent = st.number === currentStep
          return (
            <div key={st.number} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-court text-white ring-4 ring-emerald-100'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isDone ? '✓' : st.number}
                </span>
                <span
                  className={`hidden sm:inline text-xs font-semibold ${
                    isCurrent ? 'text-navy' : isDone ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-2 hidden h-0.5 flex-1 sm:block ${
                    isDone ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Checkout() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const booking = useAsync((s) => getBooking(bookingId, s), [bookingId])
  const gatewayConfig = useAsync((s) => getPaymentConfig(s), [])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(600)
  const [isExpired, setIsExpired] = useState(false)
  const inFlight = useRef(false)

  const b = booking.data

  // Calculate and update hold expiration countdown
  useEffect(() => {
    const expiryTime = b?.holdExpiresAt ? new Date(b.holdExpiresAt).getTime() : Date.now() + 600000
    const timer = setInterval(() => {
      const now = Date.now()
      const diff = Math.floor((expiryTime - now) / 1000)
      if (diff <= 0) {
        setTimeLeft(0)
        setIsExpired(true)
        clearInterval(timer)
      } else {
        setTimeLeft(diff)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [b?.holdExpiresAt])

  if (booking.loading && !booking.data) return <PageSpinner />
  if (booking.error) return <ErrorState error={booking.error} onRetry={booking.reload} />

  // If already paid and confirmed, redirect straight to confirmation page
  if (STATUS.paymentSuccess.includes(b.paymentStatus) || b.status === 'CONFIRMED') {
    return <Navigate to={`/bookings/${b.id}/confirmation`} replace />
  }

  // If cancelled or expired
  if (STATUS.bookingCancelled.includes(b.status) || isExpired) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader title="Hold Expired" subtitle="This booking hold has expired or was cancelled." />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-base font-semibold text-amber-900">
            Your 10-minute reservation hold has expired.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            To prevent slot hoarding, courts are automatically released if payment is not completed within 10 minutes.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate(b.courtId ? `/courts/${b.courtId}/book` : '/venues')}>
              Select a New Slot
            </Button>
            <Button variant="ghost" onClick={() => navigate('/my-bookings')}>
              View My Bookings
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const formatCountdown = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleRazorpayPayment = async () => {
    if (inFlight.current || isExpired) return
    inFlight.current = true
    setBusy(true)
    setError(null)

    try {
      // 1. Ensure Razorpay Checkout SDK is loaded
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Could not load the Razorpay payment gateway script. Please check your internet connection.')
      }

      // 2. Obtain authoritative Razorpay Order from server
      const orderData = await createRazorpayOrder(b.id)
      if (!orderData?.gatewayConfigured || !orderData?.orderId) {
        setError({
          title: 'Gateway Setup Required',
          message:
            orderData?.gatewayMessage ||
            'Razorpay gateway is not configured on this server. Please supply RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the backend environment variables (.env).',
        })
        setBusy(false)
        inFlight.current = false
        return
      }

      // 3. Launch Razorpay Standard Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || 'INR',
        name: 'QuickCourt',
        description: `Booking #${b.id} - ${b.courtName || 'Court'}`,
        order_id: orderData.orderId,
        prefill: {
          name: user?.name || b.userName || '',
          email: user?.email || b.userEmail || '',
          contact: user?.phone || '',
        },
        notes: {
          bookingId: String(b.id),
        },
        theme: {
          color: '#059669', // court emerald
        },
        modal: {
          ondismiss: function () {
            toast.info('Payment was cancelled or closed. Your slot remains held until the timer expires.')
            setBusy(false)
            inFlight.current = false
          },
        },
        handler: async function (response) {
          try {
            setBusy(true)
            toast.info('Verifying payment signature securely with server...')

            // Authoritative server-side verification of HMAC-SHA256 signature
            await verifyRazorpayPayment({
              bookingId: b.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })

            toast.success('Payment verified successfully! Your booking is confirmed.')
            navigate(`/bookings/${b.id}/confirmation`, { replace: true })
          } catch (verifErr) {
            setError({
              title: 'Verification Failed',
              message: verifErr.message || 'Payment verification failed. Please contact support.',
            })
            setBusy(false)
            inFlight.current = false
          }
        },
      }

      const rzpInstance = new window.Razorpay(options)
      rzpInstance.on('payment.failed', function (resp) {
        setError({
          title: 'Payment Failed',
          message: resp?.error?.description || 'Your payment attempt was declined. You can try again.',
        })
        setBusy(false)
        inFlight.current = false
      })

      rzpInstance.open()
    } catch (err) {
      const msg = err?.message || 'Payment processing failed. Please try again.'
      setError({
        title: 'Payment Error',
        message: msg,
      })
      setBusy(false)
      inFlight.current = false
    }
  }

  const handleReleaseHold = async () => {
    try {
      await releaseBookingHold(b.id)
      toast.info('Slot hold was released.')
      navigate(b.courtId ? `/courts/${b.courtId}/book` : '/venues')
    } catch (err) {
      toast.error(err)
    }
  }

  const isGatewayReady = gatewayConfig.data?.configured

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Secure Checkout"
        subtitle="Complete your payment via Razorpay to confirm your court booking."
      />

      <StepIndicator currentStep={4} />

      {/* Hold Expiration Countdown Banner */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-3 text-amber-900 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">⏱</span>
          <div>
            <p className="text-sm font-bold">Slot Temporarily Held</p>
            <p className="text-xs text-amber-800">
              Complete payment before the timer expires to secure your court.
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-xl font-extrabold tracking-wider text-amber-950">
            {formatCountdown(timeLeft)}
          </span>
          <span className="block text-[10px] uppercase tracking-wide text-amber-700">Remaining</span>
        </div>
      </div>

      {/* Booking Details Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-sky/50 p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">{b.facilityName || 'Court Booking'}</h2>
          <StatusBadge status={b.status} />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <Line k="Court" v={b.courtName || '—'} />
          <Line k="Sport" v={titleCase(b.sportType) || b.sportType || '—'} />
          <Line k="Date" v={dateLong(b.date)} />
          <Line k="Time Slot" v={timeRange(b.startTime, b.endTime)} />
          <Line k="Duration" v={b.duration ? `${b.duration} mins` : '60 mins'} />
          <Line k="Booking ID" v={`#${b.id}`} />
          <Line k="Payment Status" v={b.paymentStatus || 'PENDING'} />
          <Line k="Amount Due" v={money(b.totalAmount)} strong />
        </dl>
      </div>

      {/* Gateway Configuration Warning if not configured */}
      {!gatewayConfig.loading && !isGatewayReady && (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-950">Razorpay Setup Notice</h3>
              <p className="mt-1 text-sm text-amber-800">
                The Razorpay Payment Gateway credentials are not currently configured in this environment.
                To enable live card, UPI, and netbanking payments, set <code className="rounded bg-amber-200/70 px-1 py-0.5 font-mono text-xs">RAZORPAY_KEY_ID</code> and <code className="rounded bg-amber-200/70 px-1 py-0.5 font-mono text-xs">RAZORPAY_KEY_SECRET</code> in the backend environment.
              </p>
              <p className="mt-2 text-xs text-amber-700">
                Per security standards, simulated payments are disabled.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message if payment or verification failed */}
      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-bold">{error.title || 'Payment Error'}</p>
          <p className="mt-1">{error.message || 'An error occurred during payment processing.'}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button
          loading={busy}
          disabled={isExpired || (!isGatewayReady && !gatewayConfig.loading)}
          onClick={handleRazorpayPayment}
          size="lg"
          className="flex-1 font-bold shadow-md"
        >
          {isGatewayReady
            ? `Pay ${money(b.totalAmount)} with Razorpay`
            : 'Gateway Not Configured (Test Credentials Required)'}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={handleReleaseHold}
          disabled={busy}
        >
          Cancel Hold
        </Button>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        🔒 All transactions are encrypted and cryptographically verified using Razorpay HMAC-SHA256 signatures.
      </p>
    </div>
  )
}

const Line = ({ k, v, strong }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-slate-600">{k}</dt>
    <dd className={strong ? 'text-base font-bold text-navy' : 'font-medium text-navy'}>{v}</dd>
  </div>
)
