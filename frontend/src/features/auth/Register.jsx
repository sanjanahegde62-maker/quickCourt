import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { register } from '../../services/api/auth.api'
import { Input, Select } from '../../components/common/Form'
import Button from '../../components/common/Button'
import { FEATURES } from '../../config/endpoints'
import { useToast } from '../../components/common/Toast'

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', password: '', accountType: 'USER' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Client-side checks are a convenience only; the backend validates again.
  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address.'
    if (form.password.length < 8) e.password = 'Use at least 8 characters.'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (busy) return
    const v = validate()
    setErrors(v)
    setError(null)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      // The "role" field name/values are a guess: confirm against the register DTO.
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.accountType })
      if (FEATURES.otp) return navigate('/verify-otp', { state: { email: form.email, from: location.state?.from } })
      toast.success('Account created. Please log in.')
      navigate('/login', { state: { from: location.state?.from } })
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors)
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Input label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters." />
          <Select label="I want to" value={form.accountType} onChange={set('accountType')}
            options={[{ value: 'USER', label: 'Book courts (Player)' }, { value: 'OWNER', label: 'List my facility (Owner)' }]} />
          <Button type="submit" loading={busy} className="w-full">Sign up</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">Already registered? <Link to="/login" className="font-semibold text-court hover:underline">Log in</Link></p>
      </div>
    </div>
  )
}
