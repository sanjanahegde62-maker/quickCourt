import { useParams } from 'react-router-dom'
import { listOwnerCourts, listOwnerFacilities } from '../../services/api/owner.api'
import useAsync from '../../hooks/useAsync'
import StatusBadge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton, PageSpinner } from '../../components/common/Feedback'
import { STATUS } from '../../config/endpoints'
import { money, titleCase } from '../../utils/format'

export default function OwnerFacilityDetail() {
  const { facilityId } = useParams()
  // Uses the owner's own list so no extra endpoint is assumed; unknown IDs simply are not found.
  const list = useAsync((s) => listOwnerFacilities(s), [])
  const courts = useAsync((s) => listOwnerCourts(facilityId, s), [facilityId])

  if (list.loading && !list.data) return <PageSpinner />
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />
  const f = list.data.find((x) => String(x.id) === String(facilityId))
  if (!f) return <ErrorState title="Facility not found" error="This facility does not exist or is not yours." />

  return (
    <div>
      <PageHeader title={f.name} subtitle={f.location} action={<StatusBadge status={f.status} />} />
      {f.status === STATUS.facilityRejected && f.rejectionReason && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">Rejected: {f.rejectionReason}</p>}
      {f.description && <p className="mb-4 max-w-2xl text-slate-700">{f.description}</p>}
      <div className="mb-6 flex flex-wrap gap-2">{f.sportTypes.map((s) => <span key={s} className="rounded-full bg-mint px-3 py-1 text-sm font-medium text-court">{titleCase(s)}</span>)}</div>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Courts</h2><Button to="/owner/courts" size="sm" variant="outline">Manage courts</Button></div>
      {courts.error ? <ErrorState error={courts.error} onRetry={courts.reload} />
        : courts.loading && !courts.data ? <ListSkeleton rows={2} />
          : courts.data.length === 0 ? <EmptyState icon="grid" title="No courts yet" message="Add a court so players can book this facility." action={<Button to="/owner/courts">Add a court</Button>} />
            : <div className="grid gap-3 sm:grid-cols-2">{courts.data.map((c) => (
              <div key={c.id} className="rounded-2xl bg-sky/60 p-4"><div className="flex items-center justify-between"><p className="font-semibold text-navy">{c.name}</p><StatusBadge status={c.status} /></div><p className="text-sm text-slate-600">{titleCase(c.sportType)} · {money(c.pricePerHour)}/hr</p></div>
            ))}</div>}
    </div>
  )
}
