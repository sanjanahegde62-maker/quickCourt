import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { homeFor } from '../../auth/roleUtils'
import { Input } from '../../components/common/Form'
import Button from '../../components/common/Button'
import { FEATURES } from '../../config/endpoints'

export default function Login() {
  const { user, login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Where to go after login: the page they were trying to reach, else their dashboard.
  const from = location.state?.from
  const target = (u) => (from?.pathname && from.pathname !== '/login' ? `${from.pathname}${from.search || ''}` : homeFor(u.role))

  if (user) return <Navigate to={target(user)} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    if (!form.email || !form.password) return setError({ message: 'Enter your email and password.' })
    setBusy(true)
    try {
      const res = await login(form)
      if (FEATURES.otp && res.needsOtp) return navigate('/verify-otp', { state: { email: form.email, from } })
      navigate(target(res.user), { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Log in to book courts and manage your games.</p>
        {sessionExpired && !error && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Your session expired. Please log in again.</p>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error.status === 401 || error.status === 400 ? 'Incorrect email or password.' : error.message}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Button type="submit" loading={busy} className="w-full">Log in</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">New here? <Link to="/register" state={{ from }} className="font-semibold text-court hover:underline">Create an account</Link></p>
      </div>
    </div>
  )
}
