import { useState } from 'react'
import { listMyBookings } from '../../services/api/bookings.api'
import useAsync from '../../hooks/useAsync'
import BookingCard from './BookingCard'
import useCancel from './useCancel'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback'
import { bucketOf } from '../../services/adapters'

const TABS = [
  ['upcoming', 'Upcoming'],
  ['pending', 'Pending Payment'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
  ['other', 'Other'],
  ['all', 'All'],
]

export default function MyBookings() {
  const [tab, setTab] = useState('upcoming')
  const state = useAsync((s) => listMyBookings(s), [])
  const { askCancel, dialog } = useCancel(state.reload)

  const all = state.data || []
  const counts = Object.fromEntries(
    TABS.map(([k]) => [k, k === 'all' ? all.length : all.filter((b) => bucketOf(b) === k).length])
  )
  const shown = tab === 'all' ? all : all.filter((b) => bucketOf(b) === tab)

  return (
    <div>
      <PageHeader title="My bookings" action={<Button to="/venues" size="sm">Book a court</Button>} />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Booking filters">
        {TABS.filter(([k]) => k !== 'other' || counts.other > 0).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === k
                ? 'bg-navy text-white shadow-xs'
                : 'bg-white text-navy hover:bg-sky border border-slate-200'
            }`}
          >
            {label} <span className="opacity-70">({counts[k]})</span>
          </button>
        ))}
      </div>
      {state.error ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : state.loading && !state.data ? (
        <ListSkeleton />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={`No ${tab === 'all' ? '' : tab + ' '}bookings`}
          message="When you book a court it will show up here."
          action={<Button to="/venues">Find a court</Button>}
        />
      ) : (
        <div className="space-y-3">
          {shown.map((b) => (
            <BookingCard key={b.id} booking={b} onCancel={askCancel} />
          ))}
        </div>
      )}
      {dialog}
    </div>
  )
}
