import { useLocation, useNavigate } from 'react-router-dom'
import { closeTab, useWorkspace } from '@/lib/workspaceStore'
import { Icon } from '@/components/icons'

/** Onglets des espaces de travail ouverts (une page = un onglet, refermable). */
export default function WorkspaceTabs() {
  const { tabs } = useWorkspace()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="flex h-10 items-end gap-1 overflow-x-auto border-b border-gray-200 bg-bb-tabs px-3 pt-1.5">
      {tabs.map((tab) => {
        const active = tab.path === pathname
        return (
          <div
            key={tab.path}
            className={`flex h-8 items-center gap-1.5 rounded-t-lg border border-b-0 pl-3 pr-1.5 text-[13px] transition ${
              active
                ? 'border-gray-200 bg-white font-medium text-gray-900'
                : 'border-transparent text-gray-500 hover:bg-white/70 hover:text-gray-800'
            }`}
          >
            <button
              type="button"
              onClick={() => navigate(tab.path)}
              className="max-w-[360px] truncate whitespace-nowrap"
              title={tab.label}
            >
              {tab.label}
            </button>
            <button
              type="button"
              onClick={() => {
                const next = closeTab(tab.path)
                if (active) {
                  navigate(next)
                }
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              aria-label={`Fermer ${tab.label}`}
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
