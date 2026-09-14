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
  /** Signale des données d'exemple dans la barre d'état. */
  demo?: boolean
  children: ReactNode
}

/**
 * Espace de travail d'une page « façon BauBit » : barre d'outils, panneau Aperçu,
 * contenu, et alimentation de la barre d'état / de l'onglet.
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
  demo = false,
  children,
}: WorkspaceProps) {
  const { asideOpen } = useWorkspace()
  const { pathname } = useLocation()

  useEffect(() => {
    setStatus({ entries, left: statusLeft, right: statusRight, totals, demo })
  }, [entries, statusLeft, statusRight, totals, demo])

  useEffect(() => () => setStatus({}), [])

  useEffect(() => {
    if (tabLabel) {
      setTabLabel(pathname, tabLabel)
    }
  }, [pathname, tabLabel])

  return (
    <div className="flex h-full flex-col">
      {toolbar && (
        <div className="flex h-8 shrink-0 items-center gap-0.5 border-b border-bb-line bg-bb-ribbon px-1">
          {toolbar}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {aside && asideOpen && (
          <aside
            className="flex shrink-0 flex-col border-r border-bb-line bg-white"
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
            className="flex w-6 shrink-0 items-start justify-center border-r border-bb-line bg-bb-ribbon pt-2 text-gray-600 hover:bg-gray-200"
          >
            <span className="bb-vertical text-[12px]">Aperçu</span>
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
  /** Grandes entrées de navigation en bas du panneau (comme BauBit). */
  nav?: AsideNavItem[]
}

/** Panneau « Aperçu » : titre + punaise, contenu, navigation en bas. */
export function AsidePanel({ title = 'Aperçu', children, nav }: AsidePanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        <span className="text-[17px] text-gray-800">{title}</span>
        <button
          type="button"
          onClick={toggleAside}
          title="Masquer le panneau"
          className="rounded p-0.5 text-gray-500 hover:bg-gray-200"
        >
          <Icon name="pin" className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">{children}</div>
      {nav && nav.length > 0 && (
        <div className="shrink-0 border-t border-bb-line">
          {nav.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={`flex h-8 w-full items-center gap-2 px-3 text-left text-[15px] ${
                item.active ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <Icon name={item.icon} className="h-4 w-4 text-primary-600" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
