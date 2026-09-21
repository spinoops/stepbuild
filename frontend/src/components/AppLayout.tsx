import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { useSettings } from '@/hooks/useSettings'
import { routeLabel } from '@/lib/navigation'
import { ROLE_LABELS, primaryRole } from '@/lib/roles'
import { openTab } from '@/lib/workspaceStore'
import { Icon } from '@/components/icons'
import Brand from '@/components/Brand'
import ErrorBoundary from '@/components/ErrorBoundary'
import Ribbon from '@/components/shell/Ribbon'
import ContextBar from '@/components/shell/ContextBar'
import WorkspaceTabs from '@/components/shell/WorkspaceTabs'
import StatusBar from '@/components/shell/StatusBar'

/**
 * Cadre commun : en-tête + ruban d'actions, barre Projet/Document, onglets d'espaces
 * de travail, contenu, barre d'état. Même logique que BauBit, habillage actuel.
 */
export default function AppLayout() {
  const { user, logout } = useAuth()
  const { data: settings } = useSettings()
  const { pathname } = useLocation()

  const appName = settings?.app_name ?? 'Lachat Construction'
  const role = primaryRole(user)

  // Chaque page visitée ouvre (ou réactive) son onglet d'espace de travail.
  useEffect(() => {
    openTab(pathname, routeLabel(pathname))
  }, [pathname])

  const brand = <Brand size={28} className="mr-2" title={appName} />

  const userSlot = (
    <div className="ml-3 flex items-center gap-2 border-l border-white/15 pl-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[12px] font-semibold text-white">
        {initials(user?.name)}
      </span>
      <span className="leading-tight">
        <span className="block text-[13px] font-medium text-white">{user?.name}</span>
        <span className="block text-[11px] text-gray-400">{role ? ROLE_LABELS[role] : '—'}</span>
      </span>
      <button
        type="button"
        onClick={() => logout()}
        title="Déconnexion"
        className="ml-1 rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
      >
        <Icon name="logout" className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <div className="bb flex h-screen min-w-[1100px] flex-col overflow-hidden bg-gray-50">
      <Ribbon brand={brand} user={userSlot} />
      <ContextBar />
      <WorkspaceTabs />

      <main className="min-h-0 flex-1 bg-white">
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <StatusBar />
    </div>
  )
}

function initials(name?: string): string {
  if (!name) {
    return '?'
  }
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
