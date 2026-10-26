import { useState } from 'react'
import { listUsers, setUserStatus } from '../../services/api/admin.api'
import useAsync from '../../hooks/useAsync'
import useDebounce from '../../hooks/useDebounce'
import { ConfirmDialog } from '../../components/common/Modal'
import DataTable from '../../components/common/DataTable'
import { Input, Select } from '../../components/common/Form'
import StatusBadge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback'
import { useToast } from '../../components/common/Toast'
import { FEATURES, STATUS } from '../../config/endpoints'
import { useAuth } from '../../auth/AuthProvider'

export default function AdminUsers() {
  const toast = useToast()
  const { user: me } = useAuth()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const q = useDebounce(search)
  const state = useAsync((s) => listUsers({ search: q, role, status }, s), [q, role, status])
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const banning = target?.status !== STATUS.userBanned
  const confirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      await setUserStatus(target.id, banning ? STATUS.userBanned : STATUS.userActive)
      toast.success(banning ? 'User banned.' : 'User unbanned.')
      setTarget(null); state.reload()
    } catch (err) { toast.error(err); setTarget(null) } finally { setBusy(false) }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'rawRole', header: 'Role' },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
    ...(FEATURES.adminBan ? [{ key: 'actions', header: '', render: (u) => (
      u.id === me?.id ? <span className="text-xs text-slate-400">You</span>
        : <Button size="sm" variant={u.status === STATUS.userBanned ? 'outline' : 'ghost'} onClick={() => setTarget(u)}>{u.status === STATUS.userBanned ? 'Unban' : 'Ban'}</Button>
    ) }] : []),
  ]

  return (
    <div>
      <PageHeader title="Users" subtitle="Search players and facility owners." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Input label="Search" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select label="Role" placeholder="All roles" value={role} onChange={(e) => setRole(e.target.value)} options={['USER', 'OWNER', 'ADMIN']} />
        <Select label="Status" placeholder="Any status" value={status} onChange={(e) => setStatus(e.target.value)} options={[STATUS.userActive, STATUS.userBanned]} />
      </div>
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} />
        : state.loading && !state.data ? <ListSkeleton />
          : !state.data?.length ? <EmptyState icon="users" title="No users found" message="Try a different search or filter." />
            : <div className={state.loading ? 'opacity-60' : ''}><DataTable caption="Users" rows={state.data} columns={columns} /></div>}
      {/* The backend must still enforce that only admins can change status. */}
      <ConfirmDialog open={!!target} loading={busy} danger={banning} title={banning ? 'Ban this user?' : 'Unban this user?'} confirmLabel={banning ? 'Ban' : 'Unban'}
        message={banning ? `${target?.email} will lose access to QuickCourt.` : `${target?.email} will regain access.`} onConfirm={confirm} onCancel={() => setTarget(null)} />
    </div>
  )
}
