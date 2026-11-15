import { getAdminAnalytics } from '../../services/api/admin.api'
import useAsync from '../../hooks/useAsync'
import AnalyticsView from '../../components/dashboard/AnalyticsView'
import PageHeader from '../../components/common/PageHeader'
import { ErrorState, ListSkeleton } from '../../components/common/Feedback'

export default function AdminReports() {
  const state = useAsync((s) => getAdminAnalytics(s), [])
  return (
    <div>
      <PageHeader title="Analytics & reports" subtitle="Users, facilities, bookings and platform activity." />
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} />
        : state.loading && !state.data ? <ListSkeleton rows={3} />
          : <AnalyticsView data={state.data} />}
    </div>
  )
}
