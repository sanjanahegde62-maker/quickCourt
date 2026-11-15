import { getOwnerAnalytics } from '../../services/api/owner.api'
import useAsync from '../../hooks/useAsync'
import AnalyticsView from '../../components/dashboard/AnalyticsView'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { ErrorState, ListSkeleton } from '../../components/common/Feedback'

export default function OwnerDashboard() {
  const state = useAsync((s) => getOwnerAnalytics(s), [])
  return (
    <div>
      <PageHeader title="Owner dashboard" subtitle="Figures below come straight from the server."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => state.reload()}>Refresh</Button>
            <Button to="/owner/facilities" variant="outline" size="sm">My facilities</Button>
            <Button to="/owner/bookings" size="sm">Bookings</Button>
          </div>
        } />
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} />
        : state.loading && !state.data ? <ListSkeleton rows={3} />
          : <AnalyticsView data={state.data} />}
    </div>
  )
}
