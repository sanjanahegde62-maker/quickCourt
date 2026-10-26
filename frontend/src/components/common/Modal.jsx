import { useEffect, useRef } from 'react'
import Button from './Button'
import Icon from './Icon'

export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    ref.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-navy">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-court">
            <Icon name="x" />
          </button>
        </div>
        <div className="text-sm text-slate-700">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel, children }) {
  return (
    <Modal open={open} onClose={loading ? undefined : onCancel} title={title}
      footer={<>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>Keep</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </>}>
      {message && <p>{message}</p>}
      {children}
    </Modal>
  )
}
