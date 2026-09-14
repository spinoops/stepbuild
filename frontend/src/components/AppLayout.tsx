import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { useSettings } from '@/hooks/useSettings'
import { routeLabel } from '@/lib/navigation'
import { ROLE_LABELS, primaryRole } from '@/lib/roles'
import { openTab } from '@/lib/workspaceStore'
import { Icon } from '@/components/icons'
import Ribbon from '@/components/shell/Ribbon'
import ContextBar from '@/components/shell/ContextBar'
import WorkspaceTabs from '@/components/shell/WorkspaceTabs'
import StatusBar from '@/components/shell/StatusBar'

/**
 * Cadre commun « façon BauBit » : barre de titre, ruban, barre Projet/Document,
 * onglets d'espaces de travail, contenu, barre d'état.
 */
export default function AppLayout() {
  const { user, logout } = useAuth()
  const { data: settings } = useSettings()
  const { pathname } = useLocation()

  const appName = settings?.app_name ?? 'Chantier'
  const appLogo = settings?.app_logo_url ?? ''
  const role = primaryRole(user)

  // Chaque page visitée ouvre (ou réactive) son onglet d'espace de travail.
  useEffect(() => {
    openTab(pathname, routeLabel(pathname))
  }, [pathname])

  return (
    <div className="bb flex h-screen min-w-[1100px] flex-col overflow-hidden bg-gray-100">
      <header className="flex h-8 shrink-0 items-center bg-bb-title px-2 text-[12px] text-gray-100">
        {appLogo ? (
          <img src={appLogo} alt="" className="h-5 w-5 rounded object-contain" />
        ) : (
          <Icon name="hardhat" className="h-4 w-4 text-primary-500" />
        )}
        <span className="ml-2 font-semibold">{appName}</span>
        <span className="mx-auto text-gray-300">
          {appName} - Gestion de chantier
        </span>
        <span className="mr-3">
          {user?.name}
          <span className="ml-1 text-gray-400">({role ? ROLE_LABELS[role] : '—'})</span>
        </span>
        <button
          type="button"
          onClick={() => logout()}
          title="Déconnexion"
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10"
        >
          <Icon name="logout" className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </header>

      <Ribbon />
      <ContextBar />
      <WorkspaceTabs />

      <main className="min-h-0 flex-1 bg-white">
        <Outlet />
      </main>

      <StatusBar />
    </div>
  )
}
