import { useAuth } from '@/auth/AuthContext'
import { useWorkspace } from '@/lib/workspaceStore'

/** Barre d'état double, comme BauBit : infos de la grille, puis mandant / totaux / version. */
export default function StatusBar() {
  const { status } = useWorkspace()
  const { user } = useAuth()

  const initials = (user?.name ?? '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="border-t border-bb-line bg-bb-ribbon text-[12px]">
      <div className="flex h-6 items-center gap-3 border-b border-bb-line px-2">
        {status.entries !== null && status.entries !== undefined && (
          <span>Nombre d'entrées: {status.entries}</span>
        )}
        {status.left && <span className="border-l border-bb-line pl-3">{status.left}</span>}
        {status.right && <span className="ml-auto">{status.right}</span>}
      </div>
      <div className="flex h-6 items-center gap-3 px-2">
        <span>{initials || '—'}</span>
        <span className="border-l border-bb-line pl-3">Mandant</span>
        <select className="h-5 w-56 border border-gray-300 bg-white px-1 text-[12px] outline-none">
          <option>Standard</option>
        </select>
        {status.totals && <span className="border-l border-bb-line pl-3">{status.totals}</span>}
        <span className="ml-auto text-gray-600">
          {status.demo && <span className="mr-3 rounded bg-amber-100 px-1.5 text-amber-800">Données d'exemple</span>}
          Version 0.1 (phase 0)
        </span>
      </div>
    </div>
  )
}
