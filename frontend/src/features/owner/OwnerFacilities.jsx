import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listOwnerFacilities } from '../../services/api/owner.api'
import useAsync from '../../hooks/useAsync'
import FacilityForm from './FacilityForm'
import StatusBadge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback'
import { STATUS } from '../../config/endpoints'

export default function OwnerFacilities() {
  const state = useAsync((s) => listOwnerFacilities(s), [])
  const [form, setForm] = useState(null) // null = closed, {} = create, facility = edit

  return (
    <div>
      <PageHeader title="My facilities" subtitle="Manage your sports venues and facilities."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => state.reload()}>Refresh</Button>
            <Button onClick={() => setForm({})}>Create facility</Button>
          </div>
        } />
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} />
        : state.loading && !state.data ? <ListSkeleton />
          : state.data.length === 0 ? <EmptyState icon="building" title="No facilities yet" message="Create your first facility to start taking bookings." action={<Button onClick={() => setForm({})}>Create facility</Button>} />
            : (
              <div className="space-y-3">
                {state.data.map((f) => (
                  <article key={f.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2"><h2 className="font-bold text-navy">{f.name}</h2><StatusBadge status={f.status} /></div>
                      <p className="text-sm text-slate-600">{f.location}</p>
                      {f.status === STATUS.facilityRejected && f.rejectionReason && <p className="mt-1 text-sm text-red-700">Rejected: {f.rejectionReason}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button to={`/owner/facilities/${f.id}`} variant="outline" size="sm">Details</Button>
                      <Button variant="ghost" size="sm" onClick={() => setForm(f)}>Edit</Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
      {form && <FacilityForm key={form.id ?? 'new'} open facility={form.id ? form : null} onClose={() => setForm(null)} onSaved={state.reload} />}
      <p className="mt-6 text-sm text-slate-500"><Link to="/owner/courts" className="font-semibold text-court hover:underline">Manage courts →</Link></p>
    </div>
  )
}
