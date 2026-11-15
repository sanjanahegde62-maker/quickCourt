import { listOwnerCourts, listOwnerFacilities } from '../../services/api/owner.api'
import useAsync from '../../hooks/useAsync'
import { Select } from '../../components/common/Form'
import { EmptyState, ErrorState, PageSpinner } from '../../components/common/Feedback'
import Button from '../../components/common/Button'

/**
 * Render-prop picker: choose a facility (and optionally a court) from the owner's own data.
 * children({ facility, courts, court, reloadCourts })
 */
export default function FacilityCourtPicker({ facilityId, onFacility, courtId, onCourt, withCourt = false, children }) {
  const facilities = useAsync((s) => listOwnerFacilities(s), [])
  const fid = facilityId || facilities.data?.[0]?.id
  const courts = useAsync((s) => listOwnerCourts(fid, s), [fid], { enabled: !!fid })

  if (facilities.loading && !facilities.data) return <PageSpinner />
  if (facilities.error) return <ErrorState error={facilities.error} onRetry={facilities.reload} />
  if (!facilities.data.length) return <EmptyState icon="building" title="Create a facility first" message="You need a facility before you can add courts." action={<Button to="/owner/facilities">Go to facilities</Button>} />

  const facility = facilities.data.find((f) => String(f.id) === String(fid))
  const cid = courtId || courts.data?.[0]?.id
  const court = courts.data?.find((c) => String(c.id) === String(cid))

  return (
    <>
      <div className="mb-6 grid max-w-xl gap-3 sm:grid-cols-2">
        <Select label="Facility" value={fid} onChange={(e) => { onFacility(e.target.value); onCourt?.('') }} options={facilities.data.map((f) => ({ value: f.id, label: f.name }))} />
        {withCourt && courts.data?.length > 0 && <Select label="Court" value={cid} onChange={(e) => onCourt(e.target.value)} options={courts.data.map((c) => ({ value: c.id, label: c.name }))} />}
      </div>
      {courts.error ? <ErrorState error={courts.error} onRetry={courts.reload} /> : children({ facility, courts, court, reloadCourts: courts.reload })}
    </>
  )
}
