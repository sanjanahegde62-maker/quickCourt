import { titleCase } from '../../utils/format'

const TONES = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky text-blue-800',
  grey: 'bg-slate-100 text-slate-700',
}

const TONE_BY_STATUS = {
  CONFIRMED: 'green', BOOKED: 'green', APPROVED: 'green', ACTIVE: 'green', SUCCESS: 'green', PAID: 'green', COMPLETED: 'blue',
  PENDING: 'amber', PROCESSING: 'amber',
  CANCELLED: 'red', CANCELED: 'red', REJECTED: 'red', FAILED: 'red', BANNED: 'red', DECLINED: 'red', INACTIVE: 'grey',
}

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null
  const tone = TONES[TONE_BY_STATUS[String(status).toUpperCase()] || 'grey']
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone} ${className}`}>{titleCase(status)}</span>
}
