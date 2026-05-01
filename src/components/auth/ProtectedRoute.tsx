import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

type ProtectedRouteProps = {
  children: ReactNode
  redirectTo?: string
  preserveDestination?: boolean
}

export function ProtectedRoute({
  children,
  redirectTo = '/',
  preserveDestination = false,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="empty-state">Checking your session...</p>
  }

  if (!user) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={preserveDestination ? { from: location.pathname } : undefined}
      />
    )
  }

  return <>{children}</>
}
