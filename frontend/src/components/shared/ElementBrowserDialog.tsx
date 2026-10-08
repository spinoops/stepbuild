import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import { Icon } from '@/components/icons'
import Modal from '@/components/ui/Modal'
import { useDebounced } from '@/hooks/useDebounced'
import { api } from '@/lib/api'
import { costFamily } from '@/lib/costFamilies'
import type { Paginated, PriceElement } from '@/types'

interface ElementBrowserDialogProps {
  open: boolean
  onClose: () => void
  /** Famille d'éléments de coûts (1 salaire … 6 tiers). */
  family: number
  onPick: (element: PriceElement, keepOpen: boolean) => void
  showPrices?: boolean
}

/**
 * Fenêtre de recherche d'un élément de coûts : groupes à gauche, recherche et liste à droite.
 * Complète le champ d'ajout rapide des rapports journaliers et du sous-détail de prix.
 */
export default function ElementBrowserDialog(props: ElementBrowserDialogProps) {
  return props.open ? <ElementBrowser {...props} /> : null
}

function ElementBrowser({ onClose, family, onPick, showPrices = true }: ElementBrowserDialogProps) {
  const [group, setGroup] = useState<string | null>(null)
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const search = useDebounced(term.trim(), 200)

  const groups = useQuery({
    queryKey: ['price-elements', 'groups', family],
    queryFn: async () => (await api.get<{ data: { code: string; total: number }[] }>('/price-elements/groups', { params: { family } })).data.data,
    staleTime: 60_000,
  })
  const elements = useQuery({
    queryKey: ['price-elements', 'browser', family, group, search],
    queryFn: async () =>
      (await api.get<Paginated<PriceElement>>('/price-elements', { params: { family, group: group ?? undefined, search: search || undefined, per_page: 300, sort: 'number' } })).data.data,
    staleTime: 30_000,
  })

  const rows = elements.data ?? []
  const current = rows.find((row) => row.id === selected) ?? rows[0] ?? null

  const columns: GridColumn<PriceElement>[] = [
    { key: 'number', header: 'N°', value: (e) => e.number, width: 90 },
    { key: 'description', header: 'Désignation', value: (e) => e.description, wrap: true, width: 380 },
    { key: 'unit', header: 'Un.', value: (e) => e.unit, width: 60 },
    ...(showPrices
      ? [
          { key: 'net_price', header: 'Prix net', value: (e: PriceElement) => e.net_price ?? e.supplier_price, type: 'number' as const, width: 90 },
          { key: 'regie_price', header: 'Régie', value: (e: PriceElement) => e.regie_price, type: 'number' as const, width: 90 },
        ]
      : []),
  ]

  function pick(keepOpen: boolean) {
    if (!current) return
    onPick(current, keepOpen)
    if (!keepOpen) {
      onClose()
    }
  }

  return (
    <Modal open onClose={onClose} size="xl">
      <div className="bb flex h-[70vh] min-h-[420px] flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Éléments de coûts · {costFamily(family).label}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Fermer">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex w-[220px] shrink-0 flex-col overflow-auto rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setGroup(null)}
              className={`px-3 py-2 text-left text-[13px] ${group === null ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Tous les groupes
            </button>
            {(groups.data ?? []).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setGroup(item.code)}
                className={`flex items-center justify-between px-3 py-1.5 text-left text-[13px] ${group === item.code ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span>{item.code}</span>
                <span className="text-[11px] text-gray-400">{item.total}</span>
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="relative mb-2">
              <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value)
                  setSelected(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    pick(false)
                  } else if (event.key === 'Escape') {
                    event.stopPropagation()
                    onClose()
                  }
                }}
                placeholder="Rechercher : numéro, désignation, unité…"
                className="h-9 w-full rounded-md border border-gray-300 pl-9 pr-3 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <DataGrid
              className="min-h-0 flex-1 rounded-lg border border-gray-200"
              columns={columns}
              rows={rows}
              rowKey={(row) => String(row.id)}
              selectedKey={current ? String(current.id) : null}
              onSelect={(row) => setSelected(row.id)}
              onActivate={(row) => {
                setSelected(row.id)
                onPick(row, false)
                onClose()
              }}
              showFilter={false}
              emptyText={elements.isLoading ? 'Chargement…' : 'Aucun élément.'}
            />
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[12px] text-gray-400">
                {rows.length} élément{rows.length > 1 ? 's' : ''} · double-clic ou Entrée pour insérer
              </span>
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => pick(true)} disabled={!current} className="h-8 rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                  Insérer et continuer
                </button>
                <button type="button" onClick={() => pick(false)} disabled={!current} className="h-8 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40">
                  Insérer
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
