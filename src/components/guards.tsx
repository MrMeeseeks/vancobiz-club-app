import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Loading } from './ui'

/** Member pages: needs a login linked to a member. Admin-only logins go to the admin area. */
export function RequireMember() {
  const { session, member, isAdmin, loading } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  if (!member) return <Navigate to={isAdmin ? '/admin' : '/login'} replace />
  return <Outlet />
}

/** Admin pages. This only hides the screens; the database enforces admin access itself. */
export function RequireAdmin() {
  const { session, member, isAdmin, loading } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to={member ? '/app' : '/login'} replace />
  return <Outlet />
}
