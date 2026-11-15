import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { listOwnerBookings } from '../../services/api/owner.api'
import useAsync from '../../hooks/useAsync'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/Badge'
import { Select } from '../../components/common/Form'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback'
import { bucketOf } from '../../services/adapters'
import { dateLong, money, timeRange } from '../../utils/format'

export default function OwnerBookings() {
  const [params] = useSearchParams()
  const court = params.get('court')
  const [bucket, setBucket] = useState('')
  const state = useAsync((s) => listOwnerBookings({}, s), [])

  // The backend decides which bookings belong to this owner; filters below only narrow that list.
  const rows = (state.data || []).filter((b) => (!court || String(b.courtId) === court) && (!bucket || bucketOf(b) === bucket))

  return (
    <div>
      <PageHeader title="Bookings" subtitle={court ? 'Filtered to one court.' : 'Bookings for your facilities.'} />
      <div className="mb-4 max-w-xs">
        <Select label="Show" value={bucket} onChange={(e) => setBucket(e.target.value)} placeholder="All bookings"
          options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
      </div>
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} />
        : state.loading && !state.data ? <ListSkeleton />
          : rows.length === 0 ? <EmptyState icon="calendar" title="No bookings found" message="Bookings will appear here once players book your courts." />
            : <DataTable caption="Owner bookings" rows={rows} columns={[
              { key: 'reference', header: 'Ref' },
              { key: 'court', header: 'Facility / court', render: (b) => [b.facilityName, b.courtName].filter(Boolean).join(' · ') || '—' },
              { key: 'when', header: 'When', render: (b) => `${dateLong(b.date)} ${timeRange(b.startTime, b.endTime)}` },
              { key: 'player', header: 'Player', render: (b) => b.playerName || '—' },
              { key: 'amount', header: 'Amount', render: (b) => money(b.totalAmount) },
              { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
              { key: 'pay', header: 'Payment', render: (b) => <StatusBadge status={b.paymentStatus} /> },
            ]} />}
    </div>
  )
}
