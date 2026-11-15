import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { listOwnerBookings, updateOwnerBookingStatus, cancelOwnerBooking } from '../../services/api/owner.api'
import useAsync from '../../hooks/useAsync'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/Badge'
import { Select } from '../../components/common/Form'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { ConfirmDialog, Modal } from '../../components/common/Modal'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback'
import { useToast } from '../../components/common/Toast'
import { bucketOf } from '../../services/adapters'
import { dateLong, money, timeRange } from '../../utils/format'

export default function OwnerBookings() {
  const [params] = useSearchParams()
  const court = params.get('court')
  const [bucket, setBucket] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const toast = useToast()

  const state = useAsync((s) => listOwnerBookings({}, s), [])

  const handleUpdateStatus = async (bookingId, targetStatus) => {
    setBusyId(bookingId)
    try {
      await updateOwnerBookingStatus(bookingId, targetStatus)
      toast.success(`Booking status updated to ${targetStatus}.`)
      state.reload()
    } catch (err) {
      toast.error(err?.message || 'Failed to update booking status.')
    } finally {
      setBusyId(null)
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return
    setBusyId(cancellingBooking.id)
    try {
      await cancelOwnerBooking(cancellingBooking.id)
      toast.success(`Booking #${cancellingBooking.reference || cancellingBooking.id} cancelled.`)
      setCancellingBooking(null)
      state.reload()
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel booking.')
    } finally {
      setBusyId(null)
    }
  }

  // Filter rows by court and status bucket
  const rows = (state.data || []).filter((b) => {
    if (court && String(b.courtId) !== court) return false
    if (!bucket) return true
    return bucketOf(b) === bucket
  })

  return (
    <div>
      <PageHeader
        title="Facility Bookings"
        subtitle={court ? 'Filtered to one court.' : 'Real-time player reservations and court occupancy.'}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => state.reload()}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <Select
            label="Filter by Status"
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            options={[
              { value: '', label: 'All bookings' },
              { value: 'upcoming', label: 'Upcoming (Confirmed)' },
              { value: 'pending', label: 'Pending / Temporary Hold' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
        <div className="text-sm text-slate-500">
          Showing <span className="font-semibold text-navy">{rows.length}</span> booking{rows.length === 1 ? '' : 's'}
        </div>
      </div>

      {state.error ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : state.loading && !state.data ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No bookings found"
          message={bucket ? 'No bookings match this filter.' : 'Bookings will appear here once players book your courts.'}
        />
      ) : (
        <DataTable
          caption="Owner bookings"
          rows={rows}
          columns={[
            {
              key: 'reference',
              header: 'Ref',
              render: (b) => (
                <button
                  type="button"
                  onClick={() => setSelectedBooking(b)}
                  className="font-mono text-xs font-bold text-court hover:underline cursor-pointer"
                >
                  {b.reference || `QC-${b.id}`}
                </button>
              ),
            },
            {
              key: 'court',
              header: 'Facility / Court',
              render: (b) => (
                <div>
                  <div className="font-medium text-navy">{b.facilityName || 'Facility'}</div>
                  <div className="text-xs text-slate-500">{b.courtName || 'Court'}</div>
                </div>
              ),
            },
            {
              key: 'when',
              header: 'When',
              render: (b) => (
                <div>
                  <div className="text-sm font-medium text-slate-800">{dateLong(b.date)}</div>
                  <div className="text-xs text-slate-500">{timeRange(b.startTime, b.endTime)}</div>
                </div>
              ),
            },
            {
              key: 'player',
              header: 'Player',
              render: (b) => (
                <div>
                  <div className="font-medium text-navy">{b.playerName || b.userName || 'Player'}</div>
                  {b.playerEmail && <div className="text-xs text-slate-500">{b.playerEmail}</div>}
                </div>
              ),
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (b) => <span className="font-semibold text-navy">{money(b.totalAmount)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (b) => <StatusBadge status={b.status} />,
            },
            {
              key: 'pay',
              header: 'Payment',
              render: (b) => (
                <div className="flex flex-col gap-1 items-start">
                  <StatusBadge status={b.paymentStatus} />
                  {b.paymentMethod && (
                    <span className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                      {b.paymentMethod.replace(/^DEMO_/, 'Demo ')}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (b) => {
                const isBusy = busyId === b.id
                const isConfirmed = b.status === 'CONFIRMED' || b.status === 'BOOKED'
                const isPending = b.status === 'PENDING'

                if (isPending) {
                  return (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="xs"
                        variant="secondary"
                        loading={isBusy}
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                        title="Confirm Booking"
                      >
                        Confirm
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => setCancellingBooking(b)}
                        title="Cancel Hold"
                      >
                        Cancel
                      </Button>
                    </div>
                  )
                }

                if (isConfirmed) {
                  return (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="xs"
                        variant="primary"
                        loading={isBusy}
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                        title="Mark Complete / Checked In"
                      >
                        Complete
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={isBusy}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setCancellingBooking(b)}
                        title="Cancel Booking"
                      >
                        Cancel
                      </Button>
                    </div>
                  )
                }

                return (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setSelectedBooking(b)}
                  >
                    View
                  </Button>
                )
              },
            },
          ]}
        />
      )}

      {/* Confirmation Dialog for Cancelling */}
      <ConfirmDialog
        open={!!cancellingBooking}
        loading={busyId === cancellingBooking?.id}
        danger
        title="Cancel this booking?"
        message={`Are you sure you want to cancel booking #${cancellingBooking?.reference || cancellingBooking?.id} for ${cancellingBooking?.playerName || 'the player'}? This will release the court slot.`}
        confirmLabel="Cancel Booking"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancellingBooking(null)}
      />

      {/* Booking Details Modal */}
      {selectedBooking && (
        <Modal
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={`Booking Details #${selectedBooking.reference || selectedBooking.id}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
              <div>
                <span className="text-xs text-slate-500">Facility</span>
                <p className="font-semibold text-navy">{selectedBooking.facilityName || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Court</span>
                <p className="font-semibold text-navy">{selectedBooking.courtName || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Date</span>
                <p className="font-medium text-slate-800">{dateLong(selectedBooking.date)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Time</span>
                <p className="font-medium text-slate-800">{timeRange(selectedBooking.startTime, selectedBooking.endTime)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Player</span>
                <p className="font-medium text-slate-800">{selectedBooking.playerName || selectedBooking.userName || '—'}</p>
                {selectedBooking.playerEmail && (
                  <p className="text-xs text-slate-500">{selectedBooking.playerEmail}</p>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-500">Amount</span>
                <p className="text-lg font-bold text-court">{money(selectedBooking.totalAmount)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Booking Status</span>
                <div className="mt-1"><StatusBadge status={selectedBooking.status} /></div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Payment Status</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <StatusBadge status={selectedBooking.paymentStatus} />
                  {selectedBooking.paymentMethod && (
                    <span className="text-xs text-slate-500">({selectedBooking.paymentMethod})</span>
                  )}
                </div>
              </div>
            </div>

            {selectedBooking.transactionId && (
              <div className="text-xs text-slate-500">
                <span className="font-semibold">Transaction ID: </span>
                <span className="font-mono">{selectedBooking.transactionId}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {selectedBooking.status === 'CONFIRMED' && (
                <Button
                  size="sm"
                  onClick={() => {
                    handleUpdateStatus(selectedBooking.id, 'COMPLETED')
                    setSelectedBooking(null)
                  }}
                >
                  Mark Completed
                </Button>
              )}
              {selectedBooking.status === 'PENDING' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    handleUpdateStatus(selectedBooking.id, 'CONFIRMED')
                    setSelectedBooking(null)
                  }}
                >
                  Confirm Booking
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
