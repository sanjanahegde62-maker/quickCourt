import { listMyBookings } from '../../services/api/bookings.api'
import useAsync from '../../hooks/useAsync'
import { useAuth } from '../../auth/AuthProvider'
import BookingCard from './BookingCard'
import MetricCard from '../../components/dashboard/MetricCard'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback'
import { bucketOf } from '../../services/adapters'

export default function PlayerDashboard() {
  const { user } = useAuth()
  const state = useAsync((s) => listMyBookings(s), [])
  const all = state.data || []
  const upcoming = all.filter((b) => bucketOf(b) === 'upcoming')

  return (
    <div>
      <PageHeader title={`Hi${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`} subtitle="Here is what is coming up." action={<Button to="/venues">Book a court</Button>} />
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} />
        : state.loading && !state.data ? <ListSkeleton />
          : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard label="Upcoming" value={upcoming.length} icon="calendar" tone="bg-mint" />
                <MetricCard label="Completed" value={all.filter((b) => bucketOf(b) === 'completed').length} icon="check" tone="bg-sky" />
                <MetricCard label="Cancelled" value={all.filter((b) => bucketOf(b) === 'cancelled').length} icon="x" tone="bg-lavender" />
              </div>
              <h2 className="mb-3 mt-8 text-lg font-bold">Upcoming bookings</h2>
              {upcoming.length === 0
                ? <EmptyState icon="calendar" title="Nothing booked yet" message="Find a court and lock in your next game." action={<Button to="/venues">Explore venues</Button>} />
                : <div className="space-y-3">{upcoming.slice(0, 5).map((b) => <BookingCard key={b.id} booking={b} />)}</div>}
            </>
          )}
    </div>
  )
}
