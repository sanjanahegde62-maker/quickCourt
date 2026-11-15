import { useId } from 'react'

const base =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-court disabled:bg-slate-100'

function Field({ label, error, hint, id, children }) {
  return (
    <div>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-navy">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

export function Input({ label, error, hint, className = '', ...rest }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
        className={`${base} ${error ? 'border-red-500' : 'border-slate-300'} ${className}`} {...rest} />
    </Field>
  )
}

export function Textarea({ label, error, hint, className = '', rows = 4, ...rest }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <textarea id={id} rows={rows} aria-invalid={!!error}
        className={`${base} ${error ? 'border-red-500' : 'border-slate-300'} ${className}`} {...rest} />
    </Field>
  )
}

/** options: [{ value, label }] or plain strings */
export function Select({ label, error, hint, options = [], placeholder, className = '', ...rest }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <select id={id} aria-invalid={!!error}
        className={`${base} ${error ? 'border-red-500' : 'border-slate-300'} ${className}`} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value
          const l = typeof o === 'string' ? o : o.label
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
    </Field>
  )
}
