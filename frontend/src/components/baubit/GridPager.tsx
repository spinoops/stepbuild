import type { Paginated } from '@/types'
import { Icon } from '@/components/icons'

interface GridPagerProps {
  meta?: Paginated<unknown>['meta']
  onPage: (page: number) => void
  loading?: boolean
}

/** Pagination discrète sous une grille côté serveur (masquée s'il n'y a qu'une page). */
export default function GridPager({ meta, onPage, loading = false }: GridPagerProps) {
  if (!meta || meta.last_page <= 1) {
    return null
  }

  const from = (meta.current_page - 1) * meta.per_page + 1
  const to = Math.min(meta.total, meta.current_page * meta.per_page)
  const button =
    'flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className="flex h-9 shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-bb-ribbon px-3 text-[12px] text-gray-500">
      {loading && <span>Chargement…</span>}
      <span>
        {from}–{to} sur {meta.total}
      </span>
      <button type="button" className={button} disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} aria-label="Page précédente">
        <Icon name="chevron" className="h-4 w-4 rotate-180" />
      </button>
      <span>
        Page {meta.current_page} / {meta.last_page}
      </span>
      <button type="button" className={button} disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} aria-label="Page suivante">
        <Icon name="chevron" className="h-4 w-4" />
      </button>
    </div>
  )
}
