import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import GridPager from '@/components/baubit/GridPager'
import { BbCheckbox } from '@/components/baubit/Form'
import Badge from '@/components/ui/Badge'
import { Icon } from '@/components/icons'
import { useDebounced } from '@/hooks/useDebounced'
import { EMPTY_QUERY, useResourceList } from '@/lib/crud'
import type { GridQuery } from '@/lib/crud'
import { PROJECT_STATUSES } from '@/lib/status'
import type { Project, ProjectStatus } from '@/types'

interface ProjectPickerDialogProps {
  open: boolean
  currentId: number | null
  onClose: () => void
  onPick: (project: Project) => void
}

const STATUSES = Object.keys(PROJECT_STATUSES) as ProjectStatus[]

const COLUMNS: GridColumn<Project>[] = [
  { key: 'number', header: 'N° de projet', value: (p) => p.number, width: 110 },
  { key: 'designation1', header: 'Désignation', value: (p) => p.designation1, width: 360 },
  { key: 'client', header: 'Client', value: (p) => p.client?.label ?? '', width: 180, noFilter: true },
  { key: 'city', header: 'Lieu', value: (p) => `${p.zip ?? ''} ${p.city ?? ''}`.trim(), width: 150, noFilter: true },
  {
    key: 'status',
    header: 'Statut',
    value: (p) => PROJECT_STATUSES[p.status].label,
    width: 110,
    noFilter: true,
    render: (p) => <Badge className={PROJECT_STATUSES[p.status].className}>{PROJECT_STATUSES[p.status].label}</Badge>,
  },
]

/**
 * Choix du projet courant (barre Projet / Document) : recherche instantanée, filtres par statut et
 * « seulement actifs », liste colorée par statut. Un clic sur la ligne choisit et referme ; Entrée prend le premier.
 */
export default function ProjectPickerDialog({ open, currentId, onClose, onPick }: ProjectPickerDialogProps) {
  return open ? <ProjectPicker currentId={currentId} onClose={onClose} onPick={onPick} /> : null
}

function ProjectPicker({ currentId, onClose, onPick }: Omit<ProjectPickerDialogProps, 'open'>) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | ProjectStatus>('')
  const [onlyActive, setOnlyActive] = useState(true)
  const [query, setQuery] = useState<GridQuery>(EMPTY_QUERY)
  const list = useResourceList<Project>('projects', useDebounced(query, 200), { search: useDebounced(search, 200), status, active: onlyActive })
  const rows = list.data?.data ?? []

  function pick(project: Project) {
    onPick(project)
    onClose()
  }

  const chip = (active: boolean) =>
    `flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition ${active ? 'bg-anthracite-800 font-medium text-white' : 'text-gray-600 hover:bg-gray-100'}`

  return (
    <Modal open onClose={onClose} size="xl">
      <div className="bb flex h-[70vh] min-h-[420px] flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Choisir le projet</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Fermer">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="relative w-80">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setQuery({ ...query, page: 1 })
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && rows[0]) {
                  event.preventDefault()
                  pick(rows[0])
                } else if (event.key === 'Escape') {
                  onClose()
                }
              }}
              placeholder="Numéro, désignation, client, lieu…"
              className="h-9 w-full rounded-md border border-gray-300 pl-9 pr-3 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button type="button" className={chip(status === '')} onClick={() => setStatus('')}>
            Tous
          </button>
          {STATUSES.map((key) => (
            <button
              key={key}
              type="button"
              className={chip(status === key)}
              onClick={() => {
                setStatus(status === key ? '' : key)
                setQuery({ ...query, page: 1 })
              }}
            >
              <span className={`h-2 w-2 rounded-full border border-black/10 ${PROJECT_STATUSES[key].rowClass.split(' ')[0]}`} />
              {PROJECT_STATUSES[key].label}
            </button>
          ))}
          <BbCheckbox label="Seulement actifs" checked={onlyActive} onChange={(event) => setOnlyActive(event.target.checked)} className="ml-2" />
        </div>
        <DataGrid
          className="min-h-0 flex-1 rounded-lg border border-gray-200"
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => String(row.id)}
          rowClass={(row) => (row.is_active ? PROJECT_STATUSES[row.status].rowClass : 'bg-white text-gray-400')}
          selectedKey={currentId ? String(currentId) : null}
          onSelect={pick}
          query={query}
          onQueryChange={(next) => setQuery({ ...next, page: 1 })}
          emptyText={list.isLoading ? 'Chargement…' : 'Aucun projet pour ces critères.'}
        />
        <GridPager meta={list.data?.meta} onPage={(page) => setQuery({ ...query, page })} loading={list.isFetching} />
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onClose} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
        </div>
      </div>
    </Modal>
  )
}
