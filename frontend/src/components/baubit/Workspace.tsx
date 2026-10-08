import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { setStatus, setTabLabel, toggleAside, useWorkspace } from '@/lib/workspaceStore'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'

interface WorkspaceProps {
  /** Boutons de la barre d'outils (ToolButton, ToolMenu, ToolSep…). */
  toolbar?: ReactNode
  /** Panneau latéral gauche (AsidePanel). */
  aside?: ReactNode
  asideWidth?: number
  /** Libellé de l'onglet d'espace de travail (ex. « Devis estimatif N° … »). */
  tabLabel?: string
  /** Barre d'état : nombre d'entrées, textes gauche/droite, totaux. */
  entries?: number | null
  statusLeft?: string
  statusRight?: string
  totals?: string
  children: ReactNode
}

/**
 * Espace de travail d'une page : barre d'outils, panneau Aperçu, contenu,
 * et alimentation de la barre d'état / de l'onglet.
 */
export default function Workspace({
  toolbar,
  aside,
  asideWidth = 260,
  tabLabel,
  entries,
  statusLeft,
  statusRight,
  totals,
  children,
}: WorkspaceProps) {
  const { asideOpen } = useWorkspace()
  const { pathname } = useLocation()

  useEffect(() => {
    setStatus({ entries, left: statusLeft, right: statusRight, totals })
  }, [entries, statusLeft, statusRight, totals])

  useEffect(() => () => setStatus({}), [])

  useEffect(() => {
    if (tabLabel) {
      setTabLabel(pathname, tabLabel)
    }
  }, [pathname, tabLabel])

  return (
    <div className="flex h-full flex-col">
      {toolbar && (
        <div className="flex h-12 shrink-0 items-center gap-1 border-b border-gray-200 bg-white px-3">
          {toolbar}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {aside && asideOpen && (
          <aside
            className="flex shrink-0 flex-col border-r border-gray-200 bg-white"
            style={{ width: asideWidth }}
          >
            {aside}
          </aside>
        )}
        {aside && !asideOpen && (
          <button
            type="button"
            onClick={toggleAside}
            title="Afficher le panneau Aperçu"
            className="flex w-8 shrink-0 items-start justify-center border-r border-gray-200 bg-bb-ribbon pt-3 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <span className="bb-vertical text-[12px] font-medium">Aperçu</span>
          </button>
        )}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">{children}</section>
      </div>
    </div>
  )
}

export interface AsideNavItem {
  icon: IconName
  label: string
  active?: boolean
  onClick?: () => void
}

interface AsidePanelProps {
  title?: string
  children?: ReactNode
  /** Entrées de navigation en bas du panneau (vues de la page). */
  nav?: AsideNavItem[]
}

/** Panneau « Aperçu » : titre + punaise, contenu, navigation en bas. */
export function AsidePanel({ title = 'Aperçu', children, nav }: AsidePanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <span className="text-[14px] font-semibold text-gray-800">{title}</span>
        <button
          type="button"
          onClick={toggleAside}
          title="Masquer le panneau"
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <Icon name="pin" className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">{children}</div>
      {nav && nav.length > 0 && (
        <div className="shrink-0 space-y-0.5 border-t border-gray-200 p-2">
          {nav.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={`flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] transition ${
                item.active ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon name={item.icon} className={`h-4 w-4 ${item.active ? 'text-primary-600' : 'text-gray-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
