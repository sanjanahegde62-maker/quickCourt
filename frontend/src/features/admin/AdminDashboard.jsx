import { getAdminAnalytics } from '../../services/api/admin.api'
import useAsync from '../../hooks/useAsync'
import AnalyticsView from '../../components/dashboard/AnalyticsView'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { ErrorState, ListSkeleton } from '../../components/common/Feedback'

export default function AdminDashboard() {
  const state = useAsync((s) => getAdminAnalytics(s), [])
  return (
    <div>
      <PageHeader title="Admin dashboard" subtitle="Platform figures as reported by the server."
        action={<Button to="/admin/facilities" size="sm">Review facilities</Button>} />
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} />
        : state.loading && !state.data ? <ListSkeleton rows={3} />
          : <AnalyticsView data={state.data} />}
    </div>
  )
}
