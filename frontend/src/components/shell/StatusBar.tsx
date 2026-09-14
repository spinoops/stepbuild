import { useWorkspace } from '@/lib/workspaceStore'

/** Barre d'état : nombre d'entrées, totaux, indicateurs de la page, version. */
export default function StatusBar() {
  const { status } = useWorkspace()

  return (
    <div className="flex h-8 items-center gap-4 bg-anthracite-900 px-3 text-[12px] text-gray-400">
      {status.entries !== null && status.entries !== undefined && (
        <span>
          <span className="font-medium text-white">{status.entries}</span> entrée{status.entries > 1 ? 's' : ''}
        </span>
      )}
      {status.left && <span className="border-l border-white/15 pl-4">{status.left}</span>}
      {status.totals && <span className="border-l border-white/15 pl-4">{status.totals}</span>}
      <span className="ml-auto flex items-center gap-4">
        {status.right && <span>{status.right}</span>}
        {status.demo && (
          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">
            Données d'exemple
          </span>
        )}
        <span className="text-gray-500">v0.1 · phase 0</span>
      </span>
    </div>
  )
}
