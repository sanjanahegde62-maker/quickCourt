import { useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getCourt, getAvailability } from '../../services/api/courts.api'
import { getFacility } from '../../services/api/venues.api'
import { createBooking } from '../../services/api/bookings.api'
import useAsync from '../../hooks/useAsync'
import SlotGrid from '../../components/booking/SlotGrid'
import { Input } from '../../components/common/Form'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton, PageSpinner } from '../../components/common/Feedback'
import { useToast } from '../../components/common/Toast'
import { dateLong, money, timeRange, titleCase, todayISO } from '../../utils/format'

export default function BookCourt() {
  const { courtId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [date, setDate] = useState(todayISO())
  const [slot, setSlot] = useState(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false) // blocks double-clicks before React re-renders

  const court = useAsync((s) => (state?.court?.id == courtId ? Promise.resolve(state.court) : getCourt(courtId, s)), [courtId])
  const facility = useAsync(
    (s) => getFacility(court.data.facilityId, s), [court.data?.facilityId],
    { enabled: !!court.data?.facilityId && !state?.facilityName },
  )
  const slots = useAsync((s) => getAvailability(courtId, date, s), [courtId, date])

  if (court.loading && !court.data) return <PageSpinner />
  if (court.error) return <ErrorState error={court.error} onRetry={court.reload} />
  const c = court.data
  const facilityName = state?.facilityName || facility.data?.name

  const confirm = async () => {
    if (!slot || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    try {
      const booking = await createBooking({ courtId: c.id, slotId: slot.slotId, date })
      if (!booking?.id) throw { message: 'The server did not return a booking. Please check My bookings before trying again.' }
      navigate(`/checkout/${booking.id}`)
    } catch (err) {
      if (err.status === 409) {
        // Someone else took the slot: refresh real availability and tell the player.
        toast.error('That slot was just booked by someone else. Availability has been refreshed.')
        setSlot(null)
        slots.reload()
      } else {
        toast.error(err)
      }
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title={`Book ${c.name}`} subtitle={[facilityName, titleCase(c.sportType)].filter(Boolean).join(' · ')} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="max-w-xs"><Input label="Date" type="date" min={todayISO()} value={date} onChange={(e) => { setDate(e.target.value); setSlot(null) }} /></div>
          <h2 className="mb-3 mt-6 text-lg font-bold">Available time slots</h2>
          {slots.error ? <ErrorState error={slots.error} onRetry={slots.reload} />
            : slots.loading && !slots.data ? <ListSkeleton rows={3} />
              : slots.data?.length === 0 ? <EmptyState icon="clock" title="No slots for this date" message="Try another date." />
                : <div className={slots.loading ? 'opacity-60' : ''}><SlotGrid slots={slots.data || []} selectedId={slot?.slotId} onSelect={setSlot} /></div>}
        </section>

        <aside className="h-fit rounded-2xl bg-sky/60 p-5" aria-label="Booking summary">
          <h2 className="text-lg font-bold">Booking summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row k="Venue" v={facilityName || '—'} />
            <Row k="Court" v={c.name} />
            <Row k="Date" v={dateLong(date)} />
            <Row k="Time" v={slot ? timeRange(slot.startTime, slot.endTime) : 'Select a slot'} />
            {/* Price shown is whatever the server returned for the slot. The final amount is set by the backend when booking. */}
            <Row k="Price" v={slot ? money(slot.price) : '—'} strong />
          </dl>
          <Button className="mt-5 w-full" disabled={!slot} loading={busy} onClick={confirm}>Confirm booking</Button>
          <p className="mt-2 text-xs text-slate-600">You will complete a demo payment on the next step.</p>
        </aside>
      </div>
    </div>
  )
}

const Row = ({ k, v, strong }) => (
  <div className="flex justify-between gap-3"><dt className="text-slate-600">{k}</dt><dd className={strong ? 'font-bold text-navy' : 'font-medium text-navy'}>{v}</dd></div>
)
