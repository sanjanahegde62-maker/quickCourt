import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs fn(signal) on mount and whenever deps change. Aborts the previous request
 * (stale searches are cancelled). Returns { data, loading, error, reload, setData }.
 */
export default function useAsync(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null })
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.resolve(fnRef.current(ctrl.signal))
      .then((data) => { if (!ctrl.signal.aborted) setState({ data, loading: false, error: null }) })
      .catch((error) => {
        if (ctrl.signal.aborted || error?.cancelled) return
        setState((s) => ({ ...s, loading: false, error }))
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const setData = useCallback((updater) =>
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), [])
  return { ...state, reload, setData }
}
