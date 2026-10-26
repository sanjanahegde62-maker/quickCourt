import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as authApi from '../services/api/auth.api'
import { setUnauthorizedHandler, tokenStore } from '../services/api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => !!tokenStore.get()) // restoring a session?
  const [sessionExpired, setSessionExpired] = useState(false)
  const expiredOnce = useRef(false)

  // Restore the session on page load (authentication persistence).
  useEffect(() => {
    if (!tokenStore.get()) return
    const ctrl = new AbortController()
    authApi
      .getMe(ctrl.signal)
      .then(setUser)
      .catch((e) => { if (!e.cancelled) tokenStore.clear() })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  // A 401 from any API call lands here once; ProtectedRoute then redirects to /login (no loops).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (expiredOnce.current) return
      expiredOnce.current = true
      setUser(null)
      setSessionExpired(true)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (creds) => {
    const res = await authApi.login(creds)
    expiredOnce.current = false
    setSessionExpired(false)
    setUser(res.user)
    return res
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } finally { setUser(null) }
  }, [])

  const refreshUser = useCallback(async () => setUser(await authApi.getMe()), [])

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, logout, refreshUser, setUser }),
    [user, loading, sessionExpired, login, logout, refreshUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
