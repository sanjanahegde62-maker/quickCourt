import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { updateMe } from '../../services/api/auth.api'
import { Input } from '../../components/common/Form'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { useToast } from '../../components/common/Toast'

export default function Profile() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!form.name.trim()) return setErrors({ name: 'Name is required.' })
    setErrors({}); setBusy(true)
    try {
      // Only editable, non-privileged fields are sent. The role is never sent from the client.
      const updated = await updateMe({ name: form.name.trim(), phone: form.phone.trim() || undefined })
      setUser({ ...user, ...updated, role: user.role })
      toast.success('Profile updated.')
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors)
      toast.error(err)
    } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profile" />
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6" noValidate>
        <Input label="Email" value={user?.email || ''} disabled hint="Email cannot be changed here." readOnly />
        <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
        <p className="text-sm text-slate-600">Account type: <span className="font-semibold capitalize text-navy">{user?.role}</span></p>
        <Button type="submit" loading={busy}>Save changes</Button>
      </form>
    </div>
  )
}
