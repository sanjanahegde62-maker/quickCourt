import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestForgotPasswordOtp, verifyForgotPasswordOtp, resetPassword } from '../../services/api/auth.api'
import { Input } from '../../components/common/Form'
import Button from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const toast = useToast()

  const [step, setStep] = useState(1) // 1: Email, 2: OTP, 3: Reset, 4: Done
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [cooldown, setCooldown] = useState(0)
  const [devHint, setDevHint] = useState(null)

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return setError({ message: 'Please enter your registered email address.' })

    setBusy(true)
    setError(null)
    try {
      const res = await requestForgotPasswordOtp(trimmedEmail)
      toast.success(res?.message || 'Verification code sent to your email.')
      if (res?.devOtp) {
        setDevHint(res.devOtp)
      }
      setCooldown(res?.cooldownSeconds || 60)
      setStep(2)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const trimmedOtp = otp.trim()
    if (trimmedOtp.length !== 6) {
      return setError({ message: 'Please enter the complete 6-digit verification code.' })
    }

    setBusy(true)
    setError(null)
    try {
      const res = await verifyForgotPasswordOtp({ email, otp: trimmedOtp })
      toast.success('Verification code confirmed!')
      setResetToken(res.resetToken)
      setStep(3)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  // Resend OTP in Step 2
  const handleResend = async () => {
    if (cooldown > 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await requestForgotPasswordOtp(email)
      toast.success('A new 6-digit code has been sent.')
      if (res?.devOtp) {
        setDevHint(res.devOtp)
      }
      setCooldown(res?.cooldownSeconds || 60)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      return setError({ message: 'Password must be at least 6 characters long.' })
    }
    if (newPassword !== confirmPassword) {
      return setError({ message: 'Passwords do not match.' })
    }

    setBusy(true)
    setError(null)
    try {
      await resetPassword({ email, resetToken, newPassword, confirmPassword })
      toast.success('Password reset successfully! Please log in with your new password.')
      setStep(4)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Step Header */}
        {step < 4 && (
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-court">
              Step {step} of 3
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`h-2 rounded-full transition-all ${
                    s === step
                      ? 'w-6 bg-court'
                      : s < step
                      ? 'w-2 bg-emerald-300'
                      : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </div>
        )}

        {/* Dev OTP Helper Banner (when running in dev mode) */}
        {devHint && step === 2 && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-bold">🧪 Dev Demo OTP: <span className="font-mono text-sm tracking-widest text-blue-700">{devHint}</span></p>
            <p className="mt-0.5 text-[11px] text-blue-700">Auto-detected from local development console.</p>
          </div>
        )}

        {/* STEP 1: Request OTP */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-navy">Forgot Password</h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter your registered email address. We will generate a secure 6-digit verification code.
            </p>
            <form onSubmit={handleRequestOtp} className="mt-6 space-y-4" noValidate>
              <Input
                label="Registered Email"
                type="email"
                autoComplete="email"
                placeholder="player@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" loading={busy} className="w-full font-bold">
                Send Verification Code
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-slate-600">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-court hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-navy">Enter Verification Code</h1>
            <p className="mt-1 text-sm text-slate-600">
              We sent a 6-digit code to <span className="font-semibold text-navy">{email}</span>. Valid for 5 minutes.
            </p>
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4" noValidate>
              <Input
                label="6-Digit OTP Code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
              />
              <Button type="submit" loading={busy} className="w-full font-bold">
                Verify Code
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
              <button
                type="button"
                disabled={cooldown > 0 || busy}
                onClick={handleResend}
                className={`font-semibold ${
                  cooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-court hover:underline cursor-pointer'
                }`}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); }}
                className="text-slate-500 hover:text-navy hover:underline cursor-pointer"
              >
                Change email
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Reset Password */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-navy">Set New Password</h1>
            <p className="mt-1 text-sm text-slate-600">
              Verification successful. Enter a strong new password for your account.
            </p>
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4" noValidate>
              <Input
                label="New Password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-type your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" loading={busy} className="w-full font-bold">
                Reset Password
              </Button>
            </form>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div className="text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <span className="text-2xl font-bold">✓</span>
            </div>
            <h1 className="mt-4 text-2xl font-bold text-navy">Password Reset Successful</h1>
            <p className="mt-2 text-sm text-slate-600">
              Your account password has been updated securely with BCrypt hashing. You can now log in using your new password.
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate('/login', { replace: true })} className="w-full font-bold">
                Go to Login
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
