import { useState } from 'react'
import { blockSlots, setAvailability } from '../../services/api/owner.api'
import { getAvailability } from '../../services/api/courts.api'
import useAsync from '../../hooks/useAsync'
import FacilityCourtPicker from './FacilityCourtPicker'
import SlotGrid from '../../components/booking/SlotGrid'
import { Input } from '../../components/common/Form'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback'
import { useToast } from '../../components/common/Toast'
import { FEATURES } from '../../config/endpoints'
import { todayISO } from '../../utils/format'

export default function OwnerAvailability() {
  const [facilityId, setFacilityId] = useState('')
  const [courtId, setCourtId] = useState('')
  return (
    <div>
      <PageHeader title="Availability" subtitle="Set operating hours and block slots for maintenance. Booked slots cannot be changed here." />
      <FacilityCourtPicker facilityId={facilityId} onFacility={setFacilityId} courtId={courtId} onCourt={setCourtId} withCourt>
        {({ court, courts }) => (court ? <CourtAvailability key={court.id} court={court} /> : courts.data && <EmptyState icon="grid" title="No courts" message="Add a court first." />)}
      </FacilityCourtPicker>
    </div>
  )
}

function CourtAvailability({ court }) {
  const toast = useToast()
  const [date, setDate] = useState(todayISO())
  const [hours, setHours] = useState({ openingTime: '06:00', closingTime: '22:00' })
  const [reason, setReason] = useState('')
  const [slot, setSlot] = useState(null)
  const [busy, setBusy] = useState('')
  const slots = useAsync((s) => getAvailability(court.id, date, s), [court.id, date])

  const saveHours = async (e) => {
    e.preventDefault()
    if (busy) return
    if (hours.openingTime >= hours.closingTime) return toast.error('Opening time must be before closing time.')
    setBusy('hours')
    try { await setAvailability(court.id, hours); toast.success('Operating hours saved.'); slots.reload() }
    catch (err) { toast.error(err) } finally { setBusy('') }
  }

  const block = async () => {
    if (!slot || busy) return
    setBusy('block')
    try {
      await blockSlots(court.id, { date, startTime: slot.startTime, endTime: slot.endTime, reason: reason.trim() || undefined })
      toast.success('Slot blocked.')
      setSlot(null); setReason(''); slots.reload()
    } catch (err) {
      // 409 = the slot was booked in the meantime; the backend refuses to overwrite bookings.
      toast.error(err.status === 409 ? 'That slot already has a booking, so it cannot be blocked.' : err)
      slots.reload()
    } finally { setBusy('') }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <div className="max-w-xs"><Input label="Date" type="date" min={todayISO()} value={date} onChange={(e) => { setDate(e.target.value); setSlot(null) }} /></div>
        <h2 className="mb-3 mt-5 text-lg font-bold">Slots for {court.name}</h2>
        {slots.error ? <ErrorState error={slots.error} onRetry={slots.reload} />
          : slots.loading && !slots.data ? <ListSkeleton rows={2} />
            : !slots.data?.length ? <EmptyState icon="clock" title="No slots for this date" message="Set operating hours or pick another date." />
              : <SlotGrid slots={slots.data} selectedId={slot?.slotId} onSelect={setSlot} />}
        <p className="mt-3 text-xs text-slate-500">Greyed slots are booked or already blocked.</p>
      </section>

      <aside className="space-y-5">
        <form onSubmit={saveHours} className="space-y-3 rounded-2xl bg-sky/60 p-5">
          <h3 className="font-bold">Operating hours</h3>
          <Input label="Opens" type="time" value={hours.openingTime} onChange={(e) => setHours({ ...hours, openingTime: e.target.value })} />
          <Input label="Closes" type="time" value={hours.closingTime} onChange={(e) => setHours({ ...hours, closingTime: e.target.value })} />
          <Button type="submit" loading={busy === 'hours'} className="w-full">Save hours</Button>
        </form>
        {FEATURES.ownerBlocks && (
          <div className="space-y-3 rounded-2xl bg-lavender p-5">
            <h3 className="font-bold">Block for maintenance</h3>
            <p className="text-sm text-slate-600">{slot ? 'Block the selected slot.' : 'Select an available slot on the left.'}</p>
            <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button variant="secondary" disabled={!slot} loading={busy === 'block'} onClick={block} className="w-full">Block slot</Button>
          </div>
        )}
      </aside>
    </div>
  )
}
