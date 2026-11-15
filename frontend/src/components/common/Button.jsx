import { Link } from 'react-router-dom'

const VARIANTS = {
  primary: 'bg-court text-white hover:bg-emerald-700 focus-visible:outline-court',
  secondary: 'bg-navy text-white hover:bg-slate-800 focus-visible:outline-navy',
  outline: 'border border-navy/25 bg-white text-navy hover:bg-sky focus-visible:outline-navy',
  ghost: 'text-navy hover:bg-navy/5 focus-visible:outline-navy',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
}
const SIZES = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }

export default function Button({
  variant = 'primary', size = 'md', loading = false, disabled, to, className = '', children, type = 'button', ...rest
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  )
}
