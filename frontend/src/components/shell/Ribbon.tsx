import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { RIBBON_TABS, ribbonTabForPath } from '@/lib/ribbon'
import type { RibbonItem } from '@/lib/ribbon'
import { hasRole } from '@/lib/roles'
import { toast } from '@/lib/toast'
import { Icon } from '@/components/icons'

/**
 * Ruban façon BauBit : une rangée d'onglets, puis les groupes de boutons de l'onglet actif.
 * L'onglet suit la route courante, sauf si l'utilisateur en a choisi un autre.
 */
export default function Ribbon() {
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
    <div className="select-none border-b border-bb-ribbon-line bg-bb-ribbon">
      <div className="flex h-8 items-end gap-0.5 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setChoice({ path: pathname, tab: tab.id })}
            className={`-mb-px rounded-t px-3 pb-1 pt-1.5 text-[13px] ${
              tab.id === current?.id
                ? 'border border-b-white border-bb-ribbon-line bg-white text-bb-head'
                : 'border border-transparent text-gray-700 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <form onSubmit={onSearch} className="relative ml-auto mb-1">
          <Icon name="search" className="pointer-events-none absolute left-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Rechercher"
            className="h-6 w-48 border border-gray-300 bg-white pl-6 pr-1 text-[12px] outline-none focus:border-bb-blue"
          />
        </form>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Afficher le ruban' : 'Réduire le ruban'}
          className="mb-1 ml-1 rounded p-1 text-gray-500 hover:bg-gray-200"
        >
          <Icon name="chevrondown" className={`h-3.5 w-3.5 transition ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {!collapsed && current && (
        <div className="flex h-[102px] border-t border-bb-ribbon-line bg-white px-1">
          {current.groups.map((group) => (
            <div key={group.title} className="flex flex-col border-r border-bb-ribbon-line px-2 last:border-r-0">
              <div className="flex flex-1 items-start gap-1 pt-1">
                {group.items.some((item) => item.big) && (
                  <div className="flex gap-1">
                    {group.items.filter((item) => item.big).map((item) => (
                      <RibbonButton key={item.label} item={item} onClick={() => activate(item)} />
                    ))}
                  </div>
                )}
                {group.items.some((item) => !item.big) && (
                  <div className="grid grid-flow-col grid-rows-3 gap-x-1 gap-y-0.5">
                    {group.items.filter((item) => !item.big).map((item) => (
                      <RibbonButton key={item.label} item={item} onClick={() => activate(item)} />
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 pb-1 text-center text-[11px] leading-none text-gray-500">{group.title}</div>
            </div>
          ))}
        </div>
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
        className="flex w-16 flex-col items-center gap-1 rounded px-1 py-1 hover:bg-blue-50 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Icon name={item.icon} className="h-8 w-8 text-primary-700" />
        <span className="text-center text-[11px] leading-[13px]">{item.label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-6 items-center gap-1.5 whitespace-nowrap rounded px-1.5 text-[12px] hover:bg-blue-50 disabled:cursor-default disabled:text-gray-400 disabled:hover:bg-transparent"
    >
      <Icon name={item.icon} className={`h-4 w-4 ${disabled ? 'text-gray-300' : 'text-primary-700'}`} />
      {item.label}
    </button>
  )
}
