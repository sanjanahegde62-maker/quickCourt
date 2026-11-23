import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getBooking, releaseBookingHold } from '../../services/api/bookings.api'
import {
  createRazorpayOrder,
  getPaymentConfig,
  simulatePayment,
  verifyRazorpayPayment,
} from '../../services/api/payments.api'
import useAsync from '../../hooks/useAsync'
import { useAuth } from '../../auth/AuthProvider'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'
import { ErrorState, PageSpinner } from '../../components/common/Feedback'
import { useToast } from '../../components/common/Toast'
import { STATUS } from '../../config/endpoints'
import { dateLong, money, timeRange, titleCase } from '../../utils/format'

/**
 * Safely parse hold expiration timestamp accounting for timezone discrepancies
 * between cloud servers (which emit UTC ISO strings without 'Z') and client browsers.
 */
function getHoldExpiryTime(holdExpiresAt) {
  if (!holdExpiresAt) return Date.now() + 600000

  const rawStr = String(holdExpiresAt).trim()
  const rawDate = new Date(rawStr)
  const utcDate = new Date(rawStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(rawStr) ? rawStr : `${rawStr}Z`)

  const now = Date.now()
  const diffRaw = Math.floor((rawDate.getTime() - now) / 1000)
  const diffUtc = Math.floor((utcDate.getTime() - now) / 1000)

  // If server runs in UTC (e.g. Render/Linux/Docker), diffUtc is in (0, 660] seconds
  if (diffUtc > 0 && diffUtc <= 660) return utcDate.getTime()
  // If server runs in local timezone (e.g. local Windows dev), diffRaw is in (0, 660] seconds
  if (diffRaw > 0 && diffRaw <= 660) return rawDate.getTime()
  if (diffUtc > 0) return utcDate.getTime()
  if (diffRaw > 0) return rawDate.getTime()

  // Genuinely expired
  return Math.max(rawDate.getTime(), utcDate.getTime())
}

/** Dynamically loads the official Razorpay Checkout SDK script */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true)
      return
    }
    const existing = document.getElementById('razorpay-checkout-js')
    if (existing) {
      existing.onload = () => resolve(true)
      existing.onerror = () => resolve(false)
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-js'
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

  const [gatewayConfig, setGatewayConfig] = useState(null)
  const [paymentMode, setPaymentMode] = useState('razorpay') // 'razorpay' | 'demo'
  const [busy, setBusy] = useState(false)
  const [processingStage, setProcessingStage] = useState('')
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(600)
  const [isExpired, setIsExpired] = useState(false)
  const inFlight = useRef(false)

  // Demo payment options: 'upi', 'card', 'netbanking'
  const [demoTab, setDemoTab] = useState('upi')
  const [upiId, setUpiId] = useState('demo.player@okhdfcbank')
  const [cardForm, setCardForm] = useState({
    number: '4111 •••• •••• 4444',
    name: user?.name || 'Demo Player',
    expiry: '12/28',
    cvv: '•••',
  })
  const [selectedBank, setSelectedBank] = useState('HDFC')

  const b = booking.data

  // Fetch gateway configuration on load
  useEffect(() => {
    let active = true
    getPaymentConfig()
      .then((cfg) => {
        if (active) {
          setGatewayConfig(cfg)
          if (!cfg.razorpayConfigured && !cfg.keyId) {
            // Keep user on razorpay or demo with full visibility
          }
        }
      })
      .catch(() => {
        if (active) setGatewayConfig({ configured: false, razorpayConfigured: false, keyId: '', demoMode: true })
      })
    return () => {
      active = false
    }
  }, [])

  // Calculate and update hold expiration countdown
  useEffect(() => {
    if (!b?.holdExpiresAt) return

    const expiryTime = getHoldExpiryTime(b.holdExpiresAt)
    const updateCountdown = () => {
      const now = Date.now()
      const diff = Math.floor((expiryTime - now) / 1000)
      if (diff <= 0) {
        setTimeLeft(0)
        setIsExpired(true)
      } else {
        setTimeLeft(diff)
        setIsExpired(false)
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
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
            Your booking hold has expired. Please select a new slot.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            To prevent slot hoarding, courts are automatically released if payment is not completed within 10 minutes.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate(b.courtId ? `/book/${b.courtId}` : '/venues')}>
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

  /**
   * Primary Razorpay payment flow:
   * 1. Order creation on backend (/api/payments/order)
   * 2. Load Razorpay Checkout SDK
   * 3. Open modal with prefill & order ID
   * 4. Verify payment signature on backend (/api/payments/verify)
   */
  const handleRazorpayPayment = async () => {
    if (inFlight.current || isExpired) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    setProcessingStage('Creating secure Razorpay order...')

    try {
      const orderData = await createRazorpayOrder(b.id)
      const isConfigured = Boolean(orderData?.configured ?? orderData?.gatewayConfigured)
      const orderId = orderData?.orderId
      const keyId = orderData?.keyId || gatewayConfig?.keyId
      const amountPaise = orderData?.amountInPaise ?? orderData?.amountPaise

      // If keys are not configured on the backend, give explicit instructions rather than a generic crash
      if (!isConfigured || !orderId || !keyId) {
        setError({
          title: 'Razorpay Gateway Not Configured',
          message:
            orderData?.message ||
            orderData?.gatewayMessage ||
            'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables (Render / .env), or complete this booking using Demo Payment below.',
          showConfigHelp: true,
        })
        setBusy(false)
        inFlight.current = false
        setProcessingStage('')
        return
      }

      setProcessingStage('Opening Razorpay Checkout...')
      const loaded = await loadRazorpayScript()
      if (!loaded || !window.Razorpay) {
        setError({
          title: 'Checkout Script Failed',
          message: 'Could not load Razorpay Checkout script. Check your internet connection or use Demo Payment below.',
        })
        setBusy(false)
        inFlight.current = false
        setProcessingStage('')
        return
      }

      const options = {
        key: keyId,
        amount: amountPaise,
        currency: orderData?.currency || 'INR',
        name: 'QuickCourt',
        description: `Court Booking - ${b.facilityName || 'Arena'} (${b.courtName || 'Court'})`,
        order_id: orderId,
        handler: async function (response) {
          setProcessingStage('Verifying payment signature with QuickCourt backend...')
          try {
            const verified = await verifyRazorpayPayment({
              bookingId: b.id,
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            toast.success('Payment verified! Your court booking is confirmed.')
            navigate(`/bookings/${b.id}/confirmation`, { replace: true, state: { payment: verified } })
          } catch (err) {
            setError({
              title: 'Verification Failed',
              message: err?.message || 'Payment verification failed. Please try again or contact support.',
            })
            setBusy(false)
            inFlight.current = false
            setProcessingStage('')
          }
        },
        prefill: {
          name: user?.name || b.userName || 'Player',
          email: user?.email || b.userEmail || '',
          contact: user?.phone || b.userPhone || '',
        },
        theme: {
          color: '#059669', // Emerald court green
        },
        modal: {
          ondismiss: function () {
            setError({
              title: 'Payment Cancelled',
              message: 'Payment was cancelled. You can retry before the hold expires.',
            })
            setBusy(false)
            inFlight.current = false
            setProcessingStage('')
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (resp) {
        const failureMsg = resp.error?.description || resp.error?.reason || 'Transaction was declined.'
        setError({
          title: 'Payment Failed',
          message: `Payment failed: ${failureMsg}. You can retry or choose another payment method.`,
        })
        setBusy(false)
        inFlight.current = false
        setProcessingStage('')
      })
      rzp.open()
    } catch (err) {
      const errMsg = err?.message || 'Could not connect to payment service. Check your connection.'
      setError({
        title: 'Payment Error',
        message: errMsg,
      })
      setBusy(false)
      inFlight.current = false
      setProcessingStage('')
    }
  }

  /**
   * Instant Simulated Demo payment flow:
   * Confirms reservation and permanently locks slot without needing live Razorpay keys.
   */
  const handleSimulatedPayment = async () => {
    if (inFlight.current || isExpired) return
    inFlight.current = true
    setBusy(true)
    setError(null)

    try {
      setProcessingStage('Connecting to simulated payment gateway...')
      await new Promise((r) => setTimeout(r, 400))

      if (demoTab === 'upi') {
        setProcessingStage(`Authorizing UPI transfer (${upiId})...`)
      } else if (demoTab === 'card') {
        setProcessingStage('Verifying simulated card & 3D Secure...')
      } else {
        setProcessingStage(`Connecting to ${selectedBank} Net Banking...`)
      }
      await new Promise((r) => setTimeout(r, 500))

      setProcessingStage('Confirming court booking & locking slot...')

      const paymentMethod = `DEMO_${demoTab.toUpperCase()}`
      const result = await simulatePayment({
        bookingId: b.id,
        paymentMethod,
      })

      await new Promise((r) => setTimeout(r, 300))
      toast.success('Simulated payment successful! Your booking is confirmed.')
      navigate(`/bookings/${b.id}/confirmation`, { replace: true, state: { payment: result } })
    } catch (err) {
      setError({
        title: 'Payment Simulation Failed',
        message: err?.message || 'Could not process simulated payment. Please try again.',
      })
      setBusy(false)
      inFlight.current = false
      setProcessingStage('')
    }
  }

  const handleReleaseHold = async () => {
    try {
      await releaseBookingHold(b.id)
      toast.info('Slot hold was released.')
      navigate(b.courtId ? `/book/${b.courtId}` : '/venues')
    } catch (err) {
      toast.error(err)
    }
  }

  const isRazorpayConfigured = Boolean(gatewayConfig?.razorpayConfigured || gatewayConfig?.keyId)

  const banks = [
    { code: 'HDFC', name: 'HDFC Bank' },
    { code: 'ICICI', name: 'ICICI Bank' },
    { code: 'SBI', name: 'State Bank of India' },
    { code: 'AXIS', name: 'Axis Bank' },
    { code: 'KOTAK', name: 'Kotak Mahindra' },
  ]

  // Compute sport display cleanly
  const sportDisplay =
    b.sportType && b.sportType !== '—'
      ? titleCase(b.sportType) || b.sportType
      : b.sport && b.sport !== '—'
      ? titleCase(b.sport)
      : 'Badminton'

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Secure Checkout"
        subtitle="Complete your payment to confirm your court booking."
      />

      <StepIndicator currentStep={4} />

      {/* Hold Expiration Countdown Banner */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-3.5 text-amber-900 shadow-xs">
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
      <div className="rounded-2xl border border-slate-200/80 bg-sky/40 p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">{b.facilityName || 'Court Booking'}</h2>
          <StatusBadge status={b.status} />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <Line k="Court" v={b.courtName || 'SmashZone Court 1'} />
          <Line k="Sport" v={sportDisplay} />
          <Line k="Date" v={dateLong(b.date)} />
          <Line k="Time Slot" v={timeRange(b.startTime, b.endTime)} />
          <Line k="Duration" v={b.duration ? `${b.duration} mins` : '60 mins'} />
          <Line k="Booking ID" v={`#${b.id}`} />
          <Line k="Payment Status" v={b.paymentStatus || 'PENDING'} />
          <Line k="Amount Due" v={money(b.totalAmount)} strong />
        </dl>
      </div>

      {/* Payment Gateway Mode Selector */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-base font-bold text-navy">Select Payment Method</h3>
        <p className="mt-1 text-xs text-slate-500">
          Choose between official Razorpay checkout or simulated demo payment for project evaluation.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Mode 1: Razorpay */}
          <button
            type="button"
            onClick={() => setPaymentMode('razorpay')}
            className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
              paymentMode === 'razorpay'
                ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-slate-200 hover:bg-slate-50/80 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-bold text-sm text-navy flex items-center gap-1.5">
                💳 Razorpay Gateway
              </span>
              {isRazorpayConfigured ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  Ready
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                  Keys Required
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              UPI, Cards, NetBanking via standard Razorpay Checkout modal.
            </p>
          </button>

          {/* Mode 2: Demo Simulated */}
          <button
            type="button"
            onClick={() => setPaymentMode('demo')}
            className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
              paymentMode === 'demo'
                ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-slate-200 hover:bg-slate-50/80 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-bold text-sm text-navy flex items-center gap-1.5">
                ⚡ Demo Payment
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                Instant Simulated
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              Instant 100% simulated payment for testing without real card or API keys.
            </p>
          </button>
        </div>

        {/* Razorpay Option Details */}
        {paymentMode === 'razorpay' && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            {!isRazorpayConfigured ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="text-amber-600 text-lg">⚠️</span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Razorpay Gateway Not Configured in Backend
                    </h4>
                    <p className="mt-0.5 text-xs text-amber-800">
                      To enable live or test Razorpay Checkout, add <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">RAZORPAY_KEY_ID</code> and <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">RAZORPAY_KEY_SECRET</code> to your backend environment variables (on Render or local <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">.env</code>).
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      👉 You can still complete this booking instantly by switching to <strong>Demo Payment</strong> above!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
                <span className="text-base">🔒</span>
                <span>
                  Razorpay Test/Live Gateway active. Key ID: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{gatewayConfig?.keyId}</code>
                </span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                loading={busy}
                disabled={isExpired}
                onClick={handleRazorpayPayment}
                size="lg"
                className="flex-1 font-bold shadow-md bg-court hover:bg-emerald-700 text-white"
              >
                Pay {money(b.totalAmount)} with Razorpay
              </Button>
            </div>
          </div>
        )}

        {/* Demo Simulated Option Details */}
        {paymentMode === 'demo' && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            {/* Tab buttons */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
              {[
                { id: 'upi', label: 'UPI / QR', icon: '📱' },
                { id: 'card', label: 'Debit / Credit Card', icon: '💳' },
                { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDemoTab(tab.id)}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-bold transition-colors ${
                    demoTab === tab.id
                      ? 'border-court text-court'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-3">
              {demoTab === 'upi' && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Virtual Payment Address (VPA)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-court focus:outline-none"
                      placeholder="username@bank"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500">Quick Test VPAs:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {['demo.player@okhdfcbank', 'athlete@paytm', 'quickcourt@upi'].map((vpa) => (
                        <button
                          key={vpa}
                          type="button"
                          onClick={() => setUpiId(vpa)}
                          className={`rounded-lg border px-2 py-0.5 text-xs font-medium transition-colors ${
                            upiId === vpa
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {vpa}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {demoTab === 'card' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Card Details (Simulated)</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCardForm({
                          number: '4111 2222 3333 4444',
                          name: 'Demo Player',
                          expiry: '12/28',
                          cvv: '123',
                        })
                      }
                      className="text-xs font-bold text-court hover:underline"
                    >
                      Quick Fill Test Card
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-slate-500">Card Number</label>
                    <input
                      type="text"
                      value={cardForm.number}
                      onChange={(e) => setCardForm({ ...cardForm, number: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-1.5 font-mono text-sm text-slate-900 focus:border-court focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-500">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardForm.name}
                        onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-1.5 text-sm text-slate-900 focus:border-court focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-500">Expiry</label>
                        <input
                          type="text"
                          value={cardForm.expiry}
                          onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-mono text-sm text-slate-900 focus:border-court focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-500">CVV</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardForm.cvv}
                          onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-mono text-sm text-slate-900 focus:border-court focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {demoTab === 'netbanking' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Select Popular Bank</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {banks.map((bank) => (
                      <button
                        key={bank.code}
                        type="button"
                        onClick={() => setSelectedBank(bank.code)}
                        className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-semibold transition-all ${
                          selectedBank === bank.code
                            ? 'border-court bg-emerald-50/70 text-emerald-900 shadow-xs'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>🏦</span>
                        <span className="truncate">{bank.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                loading={busy}
                disabled={isExpired}
                onClick={handleSimulatedPayment}
                size="lg"
                className="flex-1 font-bold shadow-md bg-court hover:bg-emerald-700 text-white"
              >
                Pay {money(b.totalAmount)} (Demo Mode)
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Processing Animation / Stage Banner */}
      {busy && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-court border-t-transparent mb-2" />
          <p className="text-sm font-bold text-emerald-950">{processingStage || 'Processing payment...'}</p>
          <p className="mt-0.5 text-xs text-emerald-700">Please do not refresh or close this page.</p>
        </div>
      )}

      {/* Error Message if payment failed */}
      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-bold">{error.title || 'Payment Error'}</p>
          <p className="mt-1">{error.message || 'Payment request could not be processed. Please try again.'}</p>
          {error.showConfigHelp && (
            <div className="mt-3 rounded-lg bg-white/80 p-3 text-xs text-slate-700 border border-red-200">
              <p className="font-semibold text-slate-900">How to configure Razorpay keys:</p>
              <ol className="mt-1 list-decimal list-inside space-y-1 text-slate-600">
                <li>Log in to your Razorpay Dashboard &gt; Settings &gt; API Keys (in Test Mode).</li>
                <li>Set <code className="bg-slate-100 px-1 font-mono">RAZORPAY_KEY_ID=rzp_test_...</code> on Render or local <code className="bg-slate-100 px-1 font-mono">.env</code>.</li>
                <li>Set <code className="bg-slate-100 px-1 font-mono">RAZORPAY_KEY_SECRET=...</code> in backend environment variables.</li>
                <li>Or switch to <strong>Demo Payment</strong> above to complete the booking immediately without keys.</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Cancel Hold Button */}
      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReleaseHold}
          disabled={busy}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          Cancel Hold & Release Court
        </Button>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        🔒 Secure transaction encrypted with TLS. Slot holds expire automatically after 10 minutes to protect court availability.
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
