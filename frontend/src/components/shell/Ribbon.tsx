import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { RIBBON_TABS, ribbonTabForPath } from '@/lib/ribbon'
import type { RibbonItem } from '@/lib/ribbon'
import { hasRole } from '@/lib/roles'
import { toast } from '@/lib/toast'
import { Icon } from '@/components/icons'

interface RibbonProps {
  /** Logo et nom de l'application (à gauche de l'en-tête). */
  brand: ReactNode
  /** Utilisateur et déconnexion (à droite de l'en-tête). */
  user: ReactNode
}

/**
 * En-tête + ruban : la logique BauBit (onglets → groupes de boutons) dans un habillage
 * actuel. L'onglet suit la route courante, sauf si l'utilisateur en a choisi un autre.
 */
export default function Ribbon({ brand, user: userSlot }: RibbonProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [choice, setChoice] = useState<{ path: string; tab: string } | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const activeTab = choice && choice.path === pathname ? choice.tab : ribbonTabForPath(pathname)

  // Ctrl+K (ou Cmd+K) : focus sur la recherche.
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

  const tabs = RIBBON_TABS.map((tab) => ({
    ...tab,
    groups: tab.groups
      .map((group) => ({ ...group, items: group.items.filter((item) => hasRole(user, item.roles)) }))
      .filter((group) => group.items.length > 0),
  })).filter((tab) => tab.groups.length > 0)

  const current = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]

  function activate(item: RibbonItem) {
    if (item.to) {
      navigate(item.to)
    }
  }

  function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (searchRef.current?.value.trim()) {
      toast('Recherche globale : disponible avec les données de base (phase 1).', 'info')
    }
  }

  return (
    <div className="select-none bg-white">
      <div className="flex h-12 items-center gap-2 border-b border-gray-200 px-3">
        {brand}

        <nav className="ml-4 flex items-center gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChoice({ path: pathname, tab: tab.id })}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                tab.id === current?.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <form onSubmit={onSearch} className="relative ml-auto">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Rechercher un projet, un client, un article…"
            className="h-8 w-72 rounded-md border border-gray-200 bg-gray-50 pl-8 pr-12 text-[13px] outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-white px-1 text-[10px] text-gray-400">
            Ctrl K
          </kbd>
        </form>

        {userSlot}
      </div>

      {!collapsed && current && (
        <div className="flex h-12 items-center gap-1 border-b border-gray-200 bg-bb-ribbon px-3">
          {current.groups.map((group) => (
            <div
              key={group.title}
              className="flex items-center gap-0.5 border-r border-gray-200 pr-3 last:border-r-0 last:pr-0 [&+&]:pl-2"
            >
              <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {group.title}
              </span>
              {group.items.map((item) => (
                <RibbonButton key={item.label} item={item} onClick={() => activate(item)} />
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Réduire la barre d'actions"
            className="ml-auto rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <Icon name="chevrondown" className="h-4 w-4 rotate-180" />
          </button>
        </div>
      )}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Afficher la barre d'actions"
          className="flex h-5 w-full items-center justify-center border-b border-gray-200 bg-bb-ribbon text-gray-400 hover:text-gray-700"
        >
          <Icon name="chevrondown" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function RibbonButton({ item, onClick }: { item: RibbonItem; onClick: () => void }) {
  const disabled = !item.to
  const title = disabled ? `${item.label} : disponible dans une phase ultérieure` : item.label

  if (item.big) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className="flex h-8 items-center gap-1.5 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white shadow-sm transition hover:bg-accent-700 disabled:cursor-default disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
      >
        <Icon name={item.icon} className="h-4 w-4" />
        {item.label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[13px] text-gray-700 transition hover:bg-white hover:shadow-sm disabled:cursor-default disabled:text-gray-300 disabled:hover:bg-transparent disabled:hover:shadow-none"
    >
      <Icon name={item.icon} className={`h-4 w-4 ${disabled ? 'text-gray-300' : 'text-primary-600'}`} />
      {item.label}
    </button>
  )
}
