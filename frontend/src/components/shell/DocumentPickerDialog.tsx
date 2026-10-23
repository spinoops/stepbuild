import { useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import Badge from '@/components/ui/Badge'
import { Icon } from '@/components/icons'
import { useProjectDocuments } from '@/hooks/useDocuments'
import { fmtDate } from '@/lib/format'
import { DOCUMENT_STATUSES, DOCUMENT_TYPE_LABELS } from '@/lib/status'
import type { DocumentDetail, DocumentStatus, DocumentType } from '@/types'

interface DocumentPickerDialogProps {
  open: boolean
  projectId: number | null
  currentId: number | null
  onClose: () => void
  onPick: (document: DocumentDetail) => void
}

const TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]
const STATUSES = Object.keys(DOCUMENT_STATUSES) as DocumentStatus[]

const COLUMNS: GridColumn<DocumentDetail>[] = [
  { key: 'number', header: 'N° de document', value: (d) => d.number, width: 150 },
  { key: 'type', header: 'Type', value: (d) => DOCUMENT_TYPE_LABELS[d.type], width: 140, noFilter: true },
  { key: 'title', header: 'Objet', value: (d) => d.title, width: 260 },
  { key: 'date', header: 'Date', value: (d) => d.date, width: 100, noFilter: true, render: (d) => fmtDate(d.date) },
  {
    key: 'status',
    header: 'Statut',
    value: (d) => DOCUMENT_STATUSES[d.status].label,
    width: 110,
    noFilter: true,
    render: (d) => <Badge className={DOCUMENT_STATUSES[d.status].className}>{DOCUMENT_STATUSES[d.status].label}</Badge>,
  },
  { key: 'total_gross', header: 'TTC CHF', value: (d) => d.total_gross, type: 'number', width: 110, noFilter: true },
]

/**
 * Choix du document courant (barre Projet / Document) parmi ceux du projet : filtres par type et
 * statut, recherche sur le numéro et l'objet. Un clic ouvre le document ; Entrée prend le premier de la liste.
 */
export default function DocumentPickerDialog({ open, projectId, currentId, onClose, onPick }: DocumentPickerDialogProps) {
  return open ? <DocumentPicker projectId={projectId} currentId={currentId} onClose={onClose} onPick={onPick} /> : null
}

function DocumentPicker({ projectId, currentId, onClose, onPick }: Omit<DocumentPickerDialogProps, 'open'>) {
  const documents = useProjectDocuments(projectId)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'' | DocumentType>('')
  const [status, setStatus] = useState<'' | DocumentStatus>('')

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (documents.data ?? []).filter(
      (item) =>
        (type === '' || item.type === type) &&
        (status === '' || item.status === status) &&
        (term === '' || item.number.toLowerCase().includes(term) || (item.title ?? '').toLowerCase().includes(term)),
    )
  }, [documents.data, search, type, status])
  const counts = useMemo(() => {
    const all = documents.data ?? []
    return Object.fromEntries(TYPES.map((key) => [key, all.filter((item) => item.type === key).length])) as Record<DocumentType, number>
  }, [documents.data])

  function pick(document: DocumentDetail) {
    onPick(document)
    onClose()
  }

  const chip = (active: boolean) =>
    `flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition ${active ? 'bg-anthracite-800 font-medium text-white' : 'text-gray-600 hover:bg-gray-100'}`

  return (
    <Modal open onClose={onClose} size="xl">
      <div className="bb flex h-[60vh] min-h-[380px] flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Choisir le document</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Fermer">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="relative w-72">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && rows[0]) {
                  event.preventDefault()
                  pick(rows[0])
                } else if (event.key === 'Escape') {
                  onClose()
                }
              }}
              placeholder="Numéro ou objet…"
              className="h-9 w-full rounded-md border border-gray-300 pl-9 pr-3 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button type="button" className={chip(type === '')} onClick={() => setType('')}>
            Tous
          </button>
          {TYPES.filter((key) => counts[key] > 0).map((key) => (
            <button key={key} type="button" className={chip(type === key)} onClick={() => setType(type === key ? '' : key)}>
              {DOCUMENT_TYPE_LABELS[key]}
              <span className="opacity-70">{counts[key]}</span>
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-gray-200" />
          {STATUSES.map((key) => (
            <button key={key} type="button" className={chip(status === key)} onClick={() => setStatus(status === key ? '' : key)}>
              <span className={`h-2 w-2 rounded-full border border-black/10 ${DOCUMENT_STATUSES[key].rowClass.split(' ')[0]}`} />
              {DOCUMENT_STATUSES[key].label}
            </button>
          ))}
        </div>
        <DataGrid
          className="min-h-0 flex-1 rounded-lg border border-gray-200"
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => String(row.id)}
          rowClass={(row) => DOCUMENT_STATUSES[row.status].rowClass}
          selectedKey={currentId ? String(currentId) : null}
          onSelect={pick}
          showFilter={false}
          emptyText={documents.isLoading ? 'Chargement…' : projectId ? 'Aucun document pour ces critères.' : 'Choisissez d’abord un projet.'}
        />
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onClose} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
        </div>
      </div>
    </Modal>
  )
}
