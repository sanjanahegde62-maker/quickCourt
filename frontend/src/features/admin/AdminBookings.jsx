import { useState } from 'react'
import { listAdminBookings } from '../../services/api/admin.api'
import useAsync from '../../hooks/useAsync'
import useDebounce from '../../hooks/useDebounce'
import { Modal } from '../../components/common/Modal'
import DataTable from '../../components/common/DataTable'
import { Input, Select } from '../../components/common/Form'
import StatusBadge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback'
import { dateLong, dateTime, money, timeRange } from '../../utils/format'

export default function AdminBookings() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const q = useDebounce(search)
  const state = useAsync((s) => listAdminBookings({ search: q, status, date }, s), [q, status, date])
  const [view, setView] = useState(null)

  return (
    <div>
      <PageHeader title="Booking monitoring" subtitle="Search and review bookings across the platform." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Input label="Search" placeholder="Reference, player or venue" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select label="Status" placeholder="Any status" value={status} onChange={(e) => setStatus(e.target.value)} options={['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']} />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} />
        : state.loading && !state.data ? <ListSkeleton />
          : !state.data?.length ? <EmptyState icon="calendar" title="No bookings found" message="Try changing the filters." />
            : <div className={state.loading ? 'opacity-60' : ''}><DataTable caption="Bookings" rows={state.data} columns={[
              { key: 'reference', header: 'Ref' },
              { key: 'venue', header: 'Venue / court', render: (b) => [b.facilityName, b.courtName].filter(Boolean).join(' · ') || '—' },
              { key: 'when', header: 'When', render: (b) => `${dateLong(b.date)} ${timeRange(b.startTime, b.endTime)}` },
              { key: 'amount', header: 'Amount', render: (b) => money(b.totalAmount) },
              { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
              { key: 'v', header: '', render: (b) => <Button size="sm" variant="outline" onClick={() => setView(b)}>View</Button> },
            ]} /></div>}
      <Modal open={!!view} onClose={() => setView(null)} title={`Booking ${view?.reference ?? ''}`}>
        {view && (
          <dl className="space-y-2">
            <p><b>Venue:</b> {view.facilityName || '—'} · {view.courtName || '—'}</p>
            <p><b>When:</b> {dateLong(view.date)} {timeRange(view.startTime, view.endTime)}</p>
            <p><b>Player:</b> {[view.playerName, view.playerEmail].filter(Boolean).join(' · ') || '—'}</p>
            <p><b>Amount:</b> {money(view.totalAmount)}</p>
            <p><b>Booking:</b> <StatusBadge status={view.status} /> <b className="ml-2">Payment:</b> <StatusBadge status={view.paymentStatus} /></p>
            <p><b>Created:</b> {dateTime(view.createdAt)}</p>
          </dl>
        )}
      </Modal>
    </div>
  )
}
