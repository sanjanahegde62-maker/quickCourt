import { getOwnerAnalytics } from '../../services/api/owner.api'
import useAsync from '../../hooks/useAsync'
import AnalyticsView from '../../components/dashboard/AnalyticsView'
import PageHeader from '../../components/common/PageHeader'
import { ErrorState, ListSkeleton } from '../../components/common/Feedback'

export default function OwnerAnalytics() {
  const state = useAsync((s) => getOwnerAnalytics(s), [])
  return (
    <div>
      <PageHeader title="Earnings & analytics" subtitle="Booking trends, earnings and occupancy, as reported by the server." />
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} />
        : state.loading && !state.data ? <ListSkeleton rows={3} />
          : <AnalyticsView data={state.data} />}
    </div>
  )
}
