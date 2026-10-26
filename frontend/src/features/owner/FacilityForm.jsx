import { useState } from 'react'
import { createFacility, updateFacility } from '../../services/api/owner.api'
import { Modal } from '../../components/common/Modal'
import { Input, Textarea } from '../../components/common/Form'
import Button from '../../components/common/Button'
import { SPORTS_FALLBACK } from '../../config/endpoints'
import { titleCase } from '../../utils/format'
import { useToast } from '../../components/common/Toast'

/** Create or edit (when `facility` is given). Ownership is enforced by the backend, never by this form. */
export default function FacilityForm({ open, facility, onClose, onSaved }) {
  const toast = useToast()
  const editing = !!facility
  const [form, setForm] = useState(() => ({
    name: facility?.name || '', location: facility?.location || '', description: facility?.description || '',
    sportTypes: facility?.sportTypes || [], openingTime: facility?.openingTime?.slice(0, 5) || '06:00', closingTime: facility?.closingTime?.slice(0, 5) || '22:00',
    photos: (facility?.photos || []).join('\n'),
  }))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const toggle = (s) => setForm({ ...form, sportTypes: form.sportTypes.includes(s) ? form.sportTypes.filter((x) => x !== s) : [...form.sportTypes, s] })

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const v = {}
    if (!form.name.trim()) v.name = 'Name is required.'
    if (!form.location.trim()) v.location = 'Location is required.'
    if (!form.sportTypes.length) v.sportTypes = 'Pick at least one sport.'
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      // Field names are guesses: confirm against the facility DTO.
      const payload = {
        name: form.name.trim(), location: form.location.trim(), description: form.description.trim(),
        sportTypes: form.sportTypes, openingTime: form.openingTime, closingTime: form.closingTime,
        photos: form.photos.split('\n').map((s) => s.trim()).filter(Boolean),
      }
      const saved = editing ? await updateFacility(facility.id, payload) : await createFacility(payload)
      toast.success(editing ? 'Facility updated.' : 'Facility submitted for approval.')
      onSaved?.(saved)
      onClose()
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors)
      toast.error(err)
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit facility' : 'Create facility'}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Input label="Name" value={form.name} onChange={set('name')} error={errors.name} />
        <Input label="Location / address" value={form.location} onChange={set('location')} error={errors.location} />
        <Textarea label="Description" rows={3} value={form.description} onChange={set('description')} />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-navy">Sports</legend>
          <div className="flex flex-wrap gap-2">
            {SPORTS_FALLBACK.map((s) => (
              <label key={s} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${form.sportTypes.includes(s) ? 'border-court bg-mint text-court' : 'border-slate-300'}`}>
                <input type="checkbox" className="sr-only" checked={form.sportTypes.includes(s)} onChange={() => toggle(s)} />{titleCase(s)}
              </label>
            ))}
          </div>
          {errors.sportTypes && <p role="alert" className="mt-1 text-xs text-red-600">{errors.sportTypes}</p>}
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Opens" type="time" value={form.openingTime} onChange={set('openingTime')} />
          <Input label="Closes" type="time" value={form.closingTime} onChange={set('closingTime')} />
        </div>
        <Textarea label="Photo URLs (one per line)" rows={3} value={form.photos} onChange={set('photos')} hint="Direct image links. Replace with file upload if the backend supports it." />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>{editing ? 'Save changes' : 'Submit'}</Button>
        </div>
      </form>
    </Modal>
  )
}
