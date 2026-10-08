import { Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { useSettings } from '@/hooks/useSettings'
import Brand from '@/components/Brand'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Icon } from '@/components/icons'

/**
 * Coque réduite pour le rôle « stock » : en-tête (logo, nom, utilisateur, déconnexion) et la
 * vue des stocks, rien d'autre. Pensée pour un écran de dépôt ou une tablette.
 */
export default function StockShell() {
  const { user, logout } = useAuth()
  const { data: settings } = useSettings()
  const appName = settings?.app_name ?? 'Lachat Construction'

  return (
    <div className="bb flex min-h-screen flex-col bg-gray-50">
      <header className="flex h-12 items-center gap-3 bg-[#1c1c1c] px-4 text-white">
        <Brand size={26} title={appName} />
        <span className="text-[14px] font-semibold tracking-wide">Stocks</span>
        <span className="hidden text-[12px] text-gray-400 sm:inline">{appName}</span>
        <span className="flex-1" />
        <span className="text-[13px] text-gray-200">{user?.name}</span>
        <button
          type="button"
          onClick={() => logout()}
          title="Déconnexion"
          className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <Icon name="logout" className="h-4 w-4" />
        </button>
      </header>
      <main className="min-h-0 flex-1">
        <ErrorBoundary resetKey="stock">
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
