import { useLocation, useNavigate } from 'react-router-dom'
import { closeTab, useWorkspace } from '@/lib/workspaceStore'

/** Onglets des espaces de travail ouverts (une page = un onglet, refermable). */
export default function WorkspaceTabs() {
  const { tabs } = useWorkspace()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="flex h-7 items-end gap-px overflow-x-auto bg-bb-tabs px-1">
      {tabs.map((tab) => {
        const active = tab.path === pathname
        return (
          <div
            key={tab.path}
            className={`flex h-6 items-center gap-2 border border-b-0 border-bb-line pl-2 pr-1 text-[12px] ${
              active ? 'bg-white' : 'bg-[#efefef] text-gray-700 hover:bg-white'
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
              className="px-0.5 text-gray-500 hover:text-black"
              aria-label={`Fermer ${tab.label}`}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
