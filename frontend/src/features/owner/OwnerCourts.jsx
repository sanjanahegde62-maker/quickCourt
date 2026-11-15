import { useState } from 'react'
import { createCourt, updateCourt } from '../../services/api/owner.api'
import FacilityCourtPicker from './FacilityCourtPicker'
import { ConfirmDialog, Modal } from '../../components/common/Modal'
import { Input, Select } from '../../components/common/Form'
import StatusBadge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ListSkeleton } from '../../components/common/Feedback'
import { useToast } from '../../components/common/Toast'
import { SPORTS_FALLBACK } from '../../config/endpoints'
import { money, titleCase } from '../../utils/format'

export default function OwnerCourts() {
  const [facilityId, setFacilityId] = useState('')
  const [editing, setEditing] = useState(null) // {} = new, court = edit
  const [toggle, setToggle] = useState(null)
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const doToggle = async (reload) => {
    if (busy) return
    setBusy(true)
    try {
      // `status` values are guesses: confirm against the court DTO.
      await updateCourt(toggle.id, { status: toggle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      toast.success(toggle.status === 'ACTIVE' ? 'Court deactivated.' : 'Court activated.')
      setToggle(null); reload()
    } catch (err) { toast.error(err); setToggle(null) } finally { setBusy(false) }
  }

  return (
    <div>
      <PageHeader title="Court management" subtitle="Add courts, set pricing, and switch courts on or off." />
      <FacilityCourtPicker facilityId={facilityId} onFacility={setFacilityId}>
        {({ facility, courts, reloadCourts }) => (
          <>
            <div className="mb-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => reloadCourts()}>Refresh</Button>
              <Button onClick={() => setEditing({})}>Add court</Button>
            </div>
            {courts.loading && !courts.data ? <ListSkeleton rows={2} />
              : !courts.data?.length ? <EmptyState icon="grid" title="No courts yet" message="Add the first court for this facility." action={<Button onClick={() => setEditing({})}>Add court</Button>} />
                : (
                  <div className="space-y-3">
                    {courts.data.map((c) => (
                      <article key={c.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2"><h2 className="font-bold text-navy">{c.name}</h2><StatusBadge status={c.status} /></div>
                          <p className="text-sm text-slate-600">{titleCase(c.sportType)} · {money(c.pricePerHour)}/hr</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button to={`/owner/bookings?court=${c.id}`} variant="outline" size="sm">Bookings</Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => setToggle(c)}>{c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
            {editing && <CourtForm key={editing.id ?? 'new'} court={editing.id ? editing : null} facilityId={facility?.id} onClose={() => setEditing(null)} onSaved={reloadCourts} />}
            <ConfirmDialog open={!!toggle} loading={busy} danger={toggle?.status === 'ACTIVE'} title={toggle?.status === 'ACTIVE' ? 'Deactivate court?' : 'Activate court?'}
              message={toggle?.status === 'ACTIVE' ? 'Players will no longer be able to book this court. Existing bookings are not changed by this screen.' : 'Players will be able to book this court again.'}
              confirmLabel={toggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} onConfirm={() => doToggle(reloadCourts)} onCancel={() => setToggle(null)} />
          </>
        )}
      </FacilityCourtPicker>
    </div>
  )
}

function CourtForm({ court, facilityId, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: court?.name || '', sportType: court?.sportType || SPORTS_FALLBACK[0], pricePerHour: court?.pricePerHour ?? '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const v = {}
    if (!form.name.trim()) v.name = 'Court name is required.'
    if (!(Number(form.pricePerHour) > 0)) v.pricePerHour = 'Enter a price greater than 0.'
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      const payload = { name: form.name.trim(), sportType: form.sportType, pricePerHour: Number(form.pricePerHour) }
      if (court) await updateCourt(court.id, payload); else await createCourt(facilityId, payload)
      toast.success(court ? 'Court updated.' : 'Court added.')
      onSaved(); onClose()
    } catch (err) { if (err.fieldErrors) setErrors(err.fieldErrors); toast.error(err) } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={court ? 'Edit court' : 'Add court'}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Input label="Court name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Select label="Sport" value={form.sportType} onChange={(e) => setForm({ ...form, sportType: e.target.value })} options={SPORTS_FALLBACK.map((s) => ({ value: s, label: titleCase(s) }))} />
        <Input label="Price per hour (INR)" type="number" min="0" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })} error={errors.pricePerHour} />
        <div className="flex justify-end gap-3 pt-2"><Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" loading={busy}>Save</Button></div>
      </form>
    </Modal>
  )
}
