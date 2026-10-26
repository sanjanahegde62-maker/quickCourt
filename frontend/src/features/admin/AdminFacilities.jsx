import { useState } from 'react'
import { approveFacility, listAdminFacilities, rejectFacility } from '../../services/api/admin.api'
import useAsync from '../../hooks/useAsync'
import { ConfirmDialog, Modal } from '../../components/common/Modal'
import { Textarea } from '../../components/common/Form'
import StatusBadge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback'
import { useToast } from '../../components/common/Toast'
import { STATUS } from '../../config/endpoints'
import { titleCase } from '../../utils/format'

const TABS = [[STATUS.facilityPending, 'Pending'], [STATUS.facilityApproved, 'Approved'], [STATUS.facilityRejected, 'Rejected']]

export default function AdminFacilities() {
  const toast = useToast()
  const [tab, setTab] = useState(STATUS.facilityPending)
  const state = useAsync((s) => listAdminFacilities(tab, s), [tab])
  const [view, setView] = useState(null)
  const [approve, setApprove] = useState(null)
  const [reject, setReject] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn, okMsg, close) => {
    if (busy) return
    setBusy(true)
    try { await fn(); toast.success(okMsg); close(); state.reload() }
    catch (err) { toast.error(err); close() } finally { setBusy(false) }
  }

  return (
    <div>
      <PageHeader title="Facility approvals" subtitle="Review new facilities before they appear to players." />
      <div className="mb-5 flex gap-2" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-sky'}`}>{l}</button>)}
      </div>
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} />
        : state.loading && !state.data ? <ListSkeleton />
          : !state.data?.length ? <EmptyState icon="shield" title={`No ${titleCase(tab)} facilities`} />
            : (
              <div className="space-y-3">
                {state.data.map((f) => (
                  <article key={f.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2"><h2 className="font-bold text-navy">{f.name}</h2><StatusBadge status={f.status} /></div>
                      <p className="text-sm text-slate-600">{f.location}{f.ownerName ? ` · Owner: ${f.ownerName}` : ''}</p>
                      {f.status === STATUS.facilityRejected && f.rejectionReason && <p className="mt-1 text-sm text-red-700">Reason: {f.rejectionReason}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setView(f)}>Details</Button>
                      {f.status === STATUS.facilityPending && <>
                        <Button size="sm" onClick={() => setApprove(f)}>Approve</Button>
                        <Button variant="danger" size="sm" onClick={() => { setReject(f); setReason('') }}>Reject</Button>
                      </>}
                    </div>
                  </article>
                ))}
              </div>
            )}

      <Modal open={!!view} onClose={() => setView(null)} title={view?.name || ''}>
        {view && (
          <dl className="space-y-2">
            <p><b>Status:</b> <StatusBadge status={view.status} /></p>
            <p><b>Location:</b> {view.address || view.location || '—'}</p>
            <p><b>Sports:</b> {view.sportTypes.map(titleCase).join(', ') || '—'}</p>
            {view.description && <p className="whitespace-pre-line"><b>Description:</b> {view.description}</p>}
            {(view.ownerName || view.ownerEmail) && <p><b>Owner:</b> {[view.ownerName, view.ownerEmail].filter(Boolean).join(' · ')}</p>}
            {view.rejectionReason && <p className="text-red-700"><b>Rejection reason:</b> {view.rejectionReason}</p>}
          </dl>
        )}
      </Modal>

      <ConfirmDialog open={!!approve} loading={busy} title="Approve facility?" confirmLabel="Approve" message={`"${approve?.name}" will become visible to players.`}
        onConfirm={() => run(() => approveFacility(approve.id), 'Facility approved.', () => setApprove(null))} onCancel={() => setApprove(null)} />

      <Modal open={!!reject} onClose={() => !busy && setReject(null)} title="Reject facility"
        footer={<><Button variant="ghost" onClick={() => setReject(null)} disabled={busy}>Cancel</Button>
          <Button variant="danger" loading={busy} disabled={!reason.trim()} onClick={() => run(() => rejectFacility(reject.id, reason.trim()), 'Facility rejected.', () => setReject(null))}>Reject</Button></>}>
        <p className="mb-3">Tell the owner why <b>{reject?.name}</b> was rejected.</p>
        <Textarea label="Reason (required)" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </Modal>
    </div>
  )
}
