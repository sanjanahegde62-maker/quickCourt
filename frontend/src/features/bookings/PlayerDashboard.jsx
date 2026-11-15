import { listMyBookings } from '../../services/api/bookings.api'
import useAsync from '../../hooks/useAsync'
import { useAuth } from '../../auth/AuthProvider'
import BookingCard from './BookingCard'
import MetricCard from '../../components/dashboard/MetricCard'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback'
import { bucketOf } from '../../services/adapters'
import { money } from '../../utils/format'

export default function PlayerDashboard() {
  const { user } = useAuth()
  const state = useAsync((s) => listMyBookings(s), [])
  const all = state.data || []
  const upcoming = all.filter((b) => bucketOf(b) === 'upcoming')
  const pending = all.filter((b) => bucketOf(b) === 'pending')

  return (
    <div>
      <PageHeader
        title={`Hi${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        subtitle="Here is what is coming up."
        action={<Button to="/venues">Book a court</Button>}
      />
      {state.error ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : state.loading && !state.data ? (
        <ListSkeleton />
      ) : (
        <>
          {/* Pending hold notification banner */}
          {pending.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⏱</span>
                <div>
                  <p className="font-bold text-amber-950">
                    You have {pending.length} pending booking{pending.length > 1 ? 's' : ''} awaiting payment
                  </p>
                  <p className="text-xs text-amber-800">
                    Your court is held temporarily. Complete checkout to secure it.
                  </p>
                </div>
              </div>
              <Button to={`/checkout/${pending[0].id}`} size="sm" className="font-bold shadow-xs">
                Pay Now ({money(pending[0].totalAmount)})
              </Button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-4">
            <MetricCard label="Upcoming" value={upcoming.length} icon="calendar" tone="bg-mint" />
            <MetricCard label="Pending Payment" value={pending.length} icon="clock" tone="bg-amber-100" />
            <MetricCard label="Completed" value={all.filter((b) => bucketOf(b) === 'completed').length} icon="check" tone="bg-sky" />
            <MetricCard label="Cancelled" value={all.filter((b) => bucketOf(b) === 'cancelled').length} icon="x" tone="bg-lavender" />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-navy">Upcoming bookings</h2>
          {upcoming.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No upcoming confirmed bookings"
              message="Find a court and lock in your next game."
              action={<Button to="/venues">Explore venues</Button>}
            />
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 5).map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
