import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { useSettings } from '@/hooks/useSettings'
import { NAV_GROUPS } from '@/lib/navigation'
import { ROLE_LABELS, hasRole, primaryRole } from '@/lib/roles'
import { toast } from '@/lib/toast'
import { Icon } from '@/components/icons'

/**
 * Cadre commun des pages connectées : barre latérale par modules (filtrée selon le rôle),
 * en-tête avec recherche globale (Ctrl+K), utilisateur et déconnexion.
 */
export default function AppLayout() {
  const { user, logout } = useAuth()
  const { data: settings } = useSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const appName = settings?.app_name ?? 'Chantier'
  const appLogo = settings?.app_logo_url ?? ''
  const role = primaryRole(user)

  // Ctrl+K (ou Cmd+K) : focus sur la recherche globale.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchRef.current?.value.trim()
    if (query) {
      toast('Recherche globale : disponible avec les données de base (phase 1).', 'info')
    }
  }

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasRole(user, item.roles)),
  })).filter((group) => group.items.length > 0)

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
        {appLogo ? (
          <img src={appLogo} alt="" className="h-7 w-7 rounded object-contain" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded bg-primary-600 text-white">
            <Icon name="hardhat" className="h-4 w-4" />
          </span>
        )}
        <span className="truncate text-base font-semibold text-white">{appName}</span>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="ml-auto rounded p-1 text-slate-400 hover:text-white lg:hidden"
          aria-label="Fermer le menu"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-4 py-3">
        <p className="truncate text-sm font-medium text-white">{user?.name}</p>
        <p className="text-xs text-slate-400">{role ? ROLE_LABELS[role] : '—'}</p>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-2 flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
        >
          <Icon name="logout" className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Barre latérale (fixe sur grand écran, tiroir sur mobile) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-slate-900 lg:block">{sidebar}</aside>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900 shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <form onSubmit={onSearch} className="relative max-w-md flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              ref={searchRef}
              type="search"
              placeholder="Rechercher un projet, un client, un article…"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-14 text-sm outline-none focus:border-primary-500 focus:bg-white focus:ring-1 focus:ring-primary-500"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-gray-200 bg-white px-1.5 text-[10px] text-gray-400 sm:block">
              Ctrl K
            </kbd>
          </form>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:block">{user?.name}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {initials(user?.name)}
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
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
