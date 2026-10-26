import Icon from './Icon'
import Button from './Button'

export const Skeleton = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} aria-hidden="true" />
)

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" role="status" aria-label="Loading">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
    </div>
  )
}

export function PageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-navy" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-court border-t-transparent" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export function EmptyState({ icon = 'ball', title, message, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
      <span className="mb-3 rounded-full bg-mint p-3 text-court"><Icon name={icon} className="h-7 w-7" /></span>
      <h3 className="text-lg font-semibold text-navy">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-slate-600">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  const message = typeof error === 'string' ? error : error?.message || 'Unexpected error.'
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <span className="mb-3 rounded-full bg-red-100 p-3 text-red-600"><Icon name="alert" className="h-7 w-7" /></span>
      <h3 className="text-lg font-semibold text-red-800">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-red-700">{message}</p>
      {error?.status ? <p className="mt-1 text-xs text-red-500">Status {error.status}</p> : null}
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

/** Wraps any useAsync result: loading skeleton -> error -> empty -> children(data). */
export function AsyncBoundary({ state, skeleton = <ListSkeleton />, isEmpty, empty, children }) {
  if (state.loading && !state.data) return skeleton
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />
  if (state.data && isEmpty?.(state.data)) return empty
  return state.data ? children(state.data) : null
}
