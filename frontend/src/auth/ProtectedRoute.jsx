import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { homeFor } from './roleUtils'
import { PageSpinner } from '../components/common/Feedback'

/**
 * <ProtectedRoute roles={['owner']} />
 * - not signed in  -> /login, remembering where they wanted to go
 * - wrong role     -> their own dashboard (401 and 403 are handled separately in the API client)
 */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageSpinner label="Restoring your session…" />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}
