import { useEffect, useMemo, useRef, useState } from 'react'
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

function StepIndicator({ currentStep = 2 }) {
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

function getTomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BookCourt() {
  const { courtId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const today = useMemo(() => todayISO(), [])
  const tomorrow = useMemo(() => getTomorrowISO(), [])

  const [date, setDate] = useState(today)
  const [slot, setSlot] = useState(null)
  const [timeOfDay, setTimeOfDay] = useState('all') // all, morning, afternoon, evening
  const [availOnly, setAvailOnly] = useState(true)
  const [maxPrice, setMaxPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  const court = useAsync((s) => (state?.court?.id == courtId ? Promise.resolve(state.court) : getCourt(courtId, s)), [courtId])
  const facility = useAsync(
    (s) => getFacility(court.data.facilityId, s), [court.data?.facilityId],
    { enabled: !!court.data?.facilityId && !state?.facilityName },
  )
  const slots = useAsync((s) => getAvailability(courtId, date, s), [courtId, date])

  const reloadSlots = slots.reload
  // Real-time polling: Refresh availability every 20 seconds while player is on booking page
  useEffect(() => {
    const interval = setInterval(() => {
      reloadSlots()
    }, 20000)
    return () => clearInterval(interval)
  }, [courtId, date, reloadSlots])

  // If currently selected slot is taken or held during polling, notify user and deselect
  useEffect(() => {
    if (!slot || !slots.data) return
    const matched = slots.data.find(
      (s) => (s.id || s.slotId || `${s.startTime}-${s.endTime}`) === (slot.id || slot.slotId || `${slot.startTime}-${slot.endTime}`)
    )
    if (matched && (!matched.available || matched.status === 'HELD' || matched.status === 'BOOKED')) {
      toast.warning('The slot you selected is no longer available. Please select another slot.')
      setSlot(null)
    }
  }, [slot, slots.data, toast])

  const filteredSlots = useMemo(() => {
    let list = slots.data || []

    if (availOnly) {
      list = list.filter((s) => {
        const st = (s.status || '').toUpperCase()
        return s.available && st !== 'BOOKED' && st !== 'PAST' && st !== 'HELD'
      })
    }

    if (timeOfDay !== 'all') {
      list = list.filter((s) => {
        const hour = parseInt(s.startTime?.slice(0, 2) || '0', 10)
        if (timeOfDay === 'morning') return hour >= 6 && hour < 12
        if (timeOfDay === 'afternoon') return hour >= 12 && hour < 17
        if (timeOfDay === 'evening') return hour >= 17 && hour < 23
        return true
      })
    }

    if (maxPrice && !Number.isNaN(Number(maxPrice))) {
      list = list.filter((s) => Number(s.price || 0) <= Number(maxPrice))
    }

    return list
  }, [slots.data, availOnly, timeOfDay, maxPrice])

  if (court.loading && !court.data) return <PageSpinner />
  if (court.error) return <ErrorState error={court.error} onRetry={court.reload} />
  const c = court.data
  const facilityName = state?.facilityName || facility.data?.name

  const confirm = async () => {
    if (!slot || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    try {
      const booking = await createBooking({
        courtId: c.id,
        slotId: slot.id || slot.slotId,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
      if (!booking?.id) throw { message: 'The server did not return a valid booking ID. Please check My Bookings.' }
      navigate(`/checkout/${booking.id}`)
    } catch (err) {
      if (err.status === 409) {
        toast.error('That slot was just booked by someone else. Real-time availability has been refreshed.')
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

  const activeStep = slot ? 3 : 2

  return (
    <div>
      <PageHeader
        title={`Book ${c.name}`}
        subtitle={[facilityName, titleCase(c.sportType)].filter(Boolean).join(' · ')}
      />

      <StepIndicator currentStep={activeStep} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-6">
          {/* Filter Toolbar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Select Date</span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value)
                      setSlot(null)
                    }}
                    className="w-44 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => { setDate(today); setSlot(null) }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      date === today
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDate(tomorrow); setSlot(null) }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      date === tomorrow
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>

              {/* Availability Toggle */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filter View</span>
                <div className="mt-1.5 flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setAvailOnly(true)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      availOnly
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-navy'
                    }`}
                  >
                    Available only
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailOnly(false)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      !availOnly
                        ? 'bg-white text-navy shadow-xs'
                        : 'text-slate-600 hover:text-navy'
                    }`}
                  >
                    All slots
                  </button>
                </div>
              </div>
            </div>

            {/* Time of Day & Price filters */}
            <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-1">Time of Day:</span>
                {[
                  { id: 'all', label: 'All times' },
                  { id: 'morning', label: 'Morning (6-12)' },
                  { id: 'afternoon', label: 'Afternoon (12-17)' },
                  { id: 'evening', label: 'Evening (17-23)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeOfDay(t.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      timeOfDay === t.id
                        ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Max ₹:</span>
                <input
                  type="number"
                  placeholder="e.g. 800"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
                {maxPrice && (
                  <button
                    type="button"
                    onClick={() => setMaxPrice('')}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Slots View */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">
                Available Time Slots
                {slots.loading && !slots.data ? (
                  <span className="text-xs font-normal text-slate-400 ml-2">(Checking live availability...)</span>
                ) : slots.error ? null : (
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    ({filteredSlots.filter((s) => s.available && s.status !== 'BOOKED' && s.status !== 'PAST' && s.status !== 'HELD').length} available)
                  </span>
                )}
              </h2>
              <span className="flex items-center gap-1.5 text-xs text-emerald-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live Availability
              </span>
            </div>

            {slots.error ? (
              <ErrorState
                title="Could not load time slots"
                error={
                  slots.error?.status === 0
                    ? { message: 'Network error: Unable to reach QuickCourt backend server. Please check your connection and ensure the server is running on http://localhost:8080.' }
                    : slots.error
                }
                onRetry={slots.reload}
              />
            ) : slots.loading && !slots.data ? (
              <ListSkeleton rows={3} />
            ) : filteredSlots.length === 0 ? (
              <EmptyState
                icon="clock"
                title="No matching slots found"
                message="Try selecting 'All slots' or switching the date or time filters above."
              />
            ) : (
              <div className={slots.loading ? 'opacity-70 transition-opacity' : ''}>
                <SlotGrid
                  slots={filteredSlots}
                  selectedId={slot?.id || slot?.slotId}
                  onSelect={setSlot}
                />
              </div>
            )}
          </div>
        </section>

        {/* Booking Summary Sidebar */}
        <aside className="h-fit rounded-2xl border border-emerald-100 bg-sky/50 p-5 shadow-xs" aria-label="Booking summary">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">Booking Summary</h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Step 3 of 4
            </span>
          </div>

          <dl className="mt-4 space-y-2.5 text-sm">
            <Row k="Venue" v={facilityName || '—'} />
            <Row k="Court" v={c.name} />
            <Row k="Sport" v={titleCase(c.sportType)} />
            <Row k="Date" v={dateLong(date)} />
            <Row k="Time" v={slot ? timeRange(slot.startTime, slot.endTime) : 'Select a slot'} />
            <Row k="Duration" v={slot?.duration ? `${slot.duration} mins` : '60 mins'} />
            <Row k="Total Price" v={slot ? money(slot.price) : '—'} strong />
          </dl>

          <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900">
            <p className="font-semibold">⏱ Temporary 10-Minute Hold</p>
            <p className="mt-0.5 text-amber-800">
              When you confirm, the slot is reserved exclusively for you for 10 minutes to finish Razorpay checkout.
            </p>
          </div>

          <Button
            className="mt-5 w-full font-bold shadow-md"
            disabled={!slot}
            loading={busy}
            onClick={confirm}
          >
            Confirm booking
          </Button>

          <p className="mt-2 text-center text-xs text-slate-500">
            Secure payments powered by Razorpay.
          </p>
        </aside>
      </div>
    </div>
  )
}

const Row = ({ k, v, strong }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-slate-600">{k}</dt>
    <dd className={strong ? 'text-base font-bold text-navy' : 'font-medium text-navy'}>{v}</dd>
  </div>
)
