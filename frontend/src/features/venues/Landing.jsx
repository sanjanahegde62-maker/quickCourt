import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listFacilities } from '../../services/api/venues.api'
import useAsync from '../../hooks/useAsync'
import VenueCard from '../../components/venues/VenueCard'
import Icon from '../../components/common/Icon'
import Button from '../../components/common/Button'
import { Input, Select } from '../../components/common/Form'
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/Feedback'
import { SPORTS_FALLBACK } from '../../config/endpoints'
import { titleCase, todayISO } from '../../utils/format'

const STEPS = [
  { icon: 'search', title: 'Find a venue', text: 'Search by location and sport.' },
  { icon: 'calendar', title: 'Pick a slot', text: 'See live availability and choose a time.' },
  { icon: 'check', title: 'Book and play', text: 'Confirm your booking and show up ready.' },
]
const BENEFITS = [
  { icon: 'clock', title: 'Live availability', text: 'Slots come straight from the venue, so what you see is what is open.' },
  { icon: 'shield', title: 'Verified facilities', text: 'New venues are reviewed by our team before they are listed.' },
  { icon: 'list', title: 'Everything in one place', text: 'Track upcoming, completed and cancelled bookings.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const [q, setQ] = useState({ search: '', sport: '', date: todayISO() })
  const featured = useAsync((signal) => listFacilities({ sort: 'rating,desc', page: 0, size: 3 }, signal), [])

  const go = (e) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (q.search) p.set('search', q.search)
    if (q.sport) p.set('sport', q.sport)
    navigate(`/venues?${p.toString()}`)
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-mint to-sand">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-court">Local sports booking</p>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">Find Your Court. Play Your Game.</h1>
            <p className="mt-4 max-w-lg text-lg text-slate-600">Discover nearby facilities, check availability and book your slot in a few taps.</p>
            <form onSubmit={go} className="mt-8 grid gap-3 rounded-2xl bg-white p-4 shadow-md sm:grid-cols-2" aria-label="Search venues">
              <Input label="Location or venue" placeholder="e.g. Panaji" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value })} />
              <Select label="Sport" placeholder="Any sport" value={q.sport} onChange={(e) => setQ({ ...q, sport: e.target.value })}
                options={SPORTS_FALLBACK.map((s) => ({ value: s, label: titleCase(s) }))} />
              <Input label="Date" type="date" min={todayISO()} value={q.date} onChange={(e) => setQ({ ...q, date: e.target.value })} />
              <div className="flex items-end"><Button type="submit" className="w-full"><Icon name="search" className="h-4 w-4" />Search</Button></div>
            </form>
          </div>
          <CourtIllustration />
        </div>
      </section>

      {/* Popular sports */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-2xl font-bold">Popular sports</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {SPORTS_FALLBACK.map((s) => (
            <Link key={s} to={`/venues?sport=${s}`} className="flex flex-col items-center gap-2 rounded-2xl bg-sky p-6 text-navy transition hover:bg-mint hover:shadow">
              <Icon name="ball" className="h-9 w-9 text-court" /><span className="font-semibold">{titleCase(s)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured venues: fetched from the backend */}
      <section className="bg-lavender/50 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between"><h2 className="text-2xl font-bold">Top-rated venues</h2><Link to="/venues" className="text-sm font-semibold text-court hover:underline">View all</Link></div>
          <div className="mt-6">
            {featured.error ? <ErrorState error={featured.error} onRetry={featured.reload} />
              : featured.loading && !featured.data ? <div className="grid gap-5 md:grid-cols-3">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
                : featured.data?.items.length === 0 ? <EmptyState title="No venues yet" message="Approved venues will appear here." />
                  : <div className="grid gap-5 md:grid-cols-3">{featured.data.items.map((f) => <VenueCard key={f.id} facility={f} />)}</div>}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-center text-2xl font-bold">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-mint text-court"><Icon name={s.icon} /></span>
              <p className="text-xs font-semibold text-court">Step {i + 1}</p>
              <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Benefits */}
      <section className="bg-sky/60 py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl bg-white p-6">
              <Icon name={b.icon} className="h-7 w-7 text-court" />
              <h3 className="mt-3 text-lg font-bold">{b.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h2 className="text-3xl font-bold">Ready to play?</h2>
        <p className="mt-2 text-slate-600">Create a free account and book your first court today.</p>
        <div className="mt-6 flex justify-center gap-3"><Button to="/register" size="lg">Sign Up</Button><Button to="/venues" variant="outline" size="lg">Explore venues</Button></div>
      </section>
    </>
  )
}

function CourtIllustration() {
  return (
    <div className="hidden rounded-3xl bg-court/90 p-6 lg:block" aria-hidden="true">
      <svg viewBox="0 0 400 260" className="w-full text-white">
        <rect x="10" y="10" width="380" height="240" rx="10" fill="none" stroke="currentColor" strokeWidth="4" />
        <line x1="200" y1="10" x2="200" y2="250" stroke="currentColor" strokeWidth="4" />
        <circle cx="200" cy="130" r="38" fill="none" stroke="currentColor" strokeWidth="4" />
        <rect x="10" y="80" width="60" height="100" fill="none" stroke="currentColor" strokeWidth="4" />
        <rect x="330" y="80" width="60" height="100" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
    </div>
  )
}
