import { useState } from 'react'
import { cancelBooking } from '../../services/api/bookings.api'
import { ConfirmDialog } from '../../components/common/Modal'
import { useToast } from '../../components/common/Toast'

/**
 * const { askCancel, dialog } = useCancel(onDone)
 * Cancellation rules (refunds, cut-off times) belong to the backend: its rejection message is shown as-is.
 * After a successful cancel, onDone() re-fetches the list from the server.
 */
export default function useCancel(onDone) {
  const toast = useToast()
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    if (busy || !target) return
    setBusy(true)
    try {
      await cancelBooking(target.id)
      toast.success('Booking cancelled.')
      setTarget(null)
      onDone?.()
    } catch (err) {
      toast.error(err.status === 403 || err.status === 409 ? err.message : err)
      setTarget(null)
    } finally { setBusy(false) }
  }

  const dialog = (
    <ConfirmDialog open={!!target} danger loading={busy} title="Cancel this booking?" confirmLabel="Cancel booking"
      message="The venue's cancellation rules apply. This cannot be undone." onConfirm={confirm} onCancel={() => setTarget(null)} />
  )
  return { askCancel: setTarget, dialog }
}
