import axios from 'axios'

/**
 * The ONLY Axios instance in the app. Components never import axios directly.
 *
 * Auth: bearer JWT kept in sessionStorage (cleared when the tab closes). If the backend
 * can issue an HttpOnly cookie instead, set USE_COOKIES = true and drop the token store.
 * Passwords and OTPs are never stored; tokens are never logged.
 */
const TOKEN_KEY = 'qc_token'
const USE_COOKIES = false

export const tokenStore = {
  get: () => {
    try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (t) => {
    try { sessionStorage.setItem(TOKEN_KEY, t) } catch { /* storage unavailable */ }
  },
  clear: () => {
    try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ }
  },
}

let unauthorizedHandler = () => {}
export const setUnauthorizedHandler = (fn) => { unauthorizedHandler = fn || (() => {}) }

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  withCredentials: USE_COOKIES,
})

client.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token && !USE_COOKIES) config.headers.Authorization = `Bearer ${token}`
  return config
})

const FRIENDLY = {
  400: 'Please check the details you entered.',
  401: 'Your session has expired. Please log in again.',
  403: "You don't have permission to do that.",
  404: 'We could not find that. It may not exist, or this feature is not available on the server yet.',
  409: 'That conflicts with something that changed. Please refresh and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
}

/** Turns any Axios failure into { status, message, fieldErrors, cancelled }. Never exposes stack traces. */
export function normalizeError(err) {
  if (axios.isCancel(err) || err?.code === 'ERR_CANCELED') return { cancelled: true, message: '' }
  if (err?.normalized) return err
  if (!err?.response) {
    return { normalized: true, status: 0, message: 'Network error. Check your connection and try again.' }
  }
  const { status, data } = err.response
  const serverMsg = typeof data === 'string' ? '' : data?.message || data?.error
  let fieldErrors = null
  const raw = data?.errors ?? data?.fieldErrors
  if (Array.isArray(raw)) {
    fieldErrors = Object.fromEntries(raw.map((e) => [e.field || e.name, e.message || e.defaultMessage]))
  } else if (raw && typeof raw === 'object') {
    fieldErrors = raw
  }
  return {
    normalized: true,
    status,
    // 5xx messages from the server are never shown verbatim
    message: status >= 500 ? FRIENDLY[500] : serverMsg || FRIENDLY[status] || 'Unexpected error.',
    fieldErrors,
  }
}

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const n = normalizeError(err)
    const url = err?.config?.url || ''
    // 401 = session problem -> clear and notify once. Login/register 401s are just bad credentials.
    // 403 = signed in but not allowed -> passed through untouched.
    if (n.status === 401 && !url.includes('/auth/')) {
      tokenStore.clear()
      unauthorizedHandler()
    }
    return Promise.reject(n)
  },
)

export default client
