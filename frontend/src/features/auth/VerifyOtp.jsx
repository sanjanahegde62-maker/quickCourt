import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { requestOtp, verifyOtp } from '../../services/api/auth.api'
import { Input } from '../../components/common/Form'
import Button from '../../components/common/Button'
import { FEATURES } from '../../config/endpoints'
import { useToast } from '../../components/common/Toast'

/** Only reachable when FEATURES.otp is true. The OTP lives in component state only (never in storage or logs). */
export default function VerifyOtp() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const toast = useToast()
  const [otp, setOtp] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!FEATURES.otp) return <Navigate to="/login" replace />
  const email = state?.email

  const submit = async (e) => {
    e.preventDefault()
    if (busy || !otp.trim()) return
    setBusy(true); setError(null)
    try {
      await verifyOtp({ email, otp: otp.trim() })
      toast.success('Account verified. Please log in.')
      navigate('/login', { state: { from: state?.from } })
    } catch (err) { setError(err) } finally { setBusy(false) }
  }

  const resend = async () => {
    try { await requestOtp({ email }); toast.success('A new code has been sent.') } catch (err) { toast.error(err) }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">Verify your account</h1>
        <p className="mt-1 text-sm text-slate-600">Enter the code sent to {email || 'your email'}.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label="One-time code" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} />
          <Button type="submit" loading={busy} className="w-full">Verify</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <button className="font-semibold text-court hover:underline" onClick={resend}>Resend code</button>
          <Link to="/login" className="text-slate-600 hover:underline">Back to login</Link>
        </div>
      </div>
    </div>
  )
}
