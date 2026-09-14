import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { hasRole } from '@/lib/roles'
import type { Role } from '@/types'

interface RoleRouteProps {
  roles: Role[]
}

/** Réserve les routes enfants aux rôles indiqués (redirige vers le tableau de bord sinon). */
export default function RoleRoute({ roles }: RoleRouteProps) {
  const { user } = useAuth()

  if (!hasRole(user, roles)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
