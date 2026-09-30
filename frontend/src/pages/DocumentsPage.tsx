import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { ToolButton, ToolPrimary, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import GridPager from '@/components/baubit/GridPager'
import DocumentEditor from '@/components/documents/DocumentEditor'
import DocumentHeaderForm, { DOCUMENT_FORM_ID } from '@/components/documents/DocumentHeaderForm'
import DocumentPreview from '@/components/documents/DocumentPreview'
import DocumentRecap from '@/components/documents/DocumentRecap'
import StepsPanel from '@/components/documents/StepsPanel'
import TemplateChooser from '@/components/documents/TemplateChooser'
import { Icon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import { useDebounced } from '@/hooks/useDebounced'
import { useCreateDocument, useDocument, useDocumentActions, useProjectDocuments } from '@/hooks/useDocuments'
import { SAVE_LABELS } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import { useQuoteTemplates, useSaveDocumentAsTemplate } from '@/hooks/useQuoteTemplates'
import { useSelection } from '@/hooks/useSelection'
import { EMPTY_QUERY, useDeleteResource, useResourceList } from '@/lib/crud'
import type { GridQuery } from '@/lib/crud'
import { fmtAmount, fmtDate } from '@/lib/format'
import { DOCUMENT_STATUSES, DOCUMENT_TYPE_LABELS } from '@/lib/status'
import { toast } from '@/lib/toast'
import { setDocument, setProject, useWorkspace } from '@/lib/workspaceStore'
import type { DocumentDetail } from '@/types'

const TABS = ['Détail', 'En-tête', 'Récapitulation', 'Aperçu', 'Explorateur']

const EXPLORER_COLUMNS: GridColumn<DocumentDetail>[] = [
  { key: 'number', header: 'N° de document', value: (d) => d.number, width: 160 },
  { key: 'type', header: 'Type', value: (d) => DOCUMENT_TYPE_LABELS[d.type], width: 90, noFilter: true },
  { key: 'project', header: 'Projet', value: (d) => d.project?.designation1 ?? '', width: 320, noFilter: true },
  { key: 'title', header: 'Objet', value: (d) => d.title, width: 220 },
  { key: 'recipient_name', header: 'Destinataire', value: (d) => `${d.recipient_name ?? ''} ${d.recipient_first_name ?? ''}`.trim(), width: 180 },
  { key: 'date', header: 'Date', value: (d) => d.date, width: 100, noFilter: true, render: (d) => fmtDate(d.date) },
  {
    key: 'status',
    header: 'Statut',
    value: (d) => DOCUMENT_STATUSES[d.status].label,
    width: 110,
    noFilter: true,
    render: (d) => <Badge className={DOCUMENT_STATUSES[d.status].className}>{DOCUMENT_STATUSES[d.status].label}</Badge>,
  },
  { key: 'total_net', header: 'Net CHF', value: (d) => d.total_net, type: 'number', width: 110, noFilter: true },
  { key: 'total_gross', header: 'TTC CHF', value: (d) => d.total_gross, type: 'number', width: 110, noFilter: true },
]

/**
 * Devis du projet courant : étapes (depuis les modèles) à gauche, détail éditable, en-tête,
 * récapitulation. L'explorateur liste tous les documents, tous projets confondus.
 */
export default function DocumentsPage() {
  const navigate = useNavigate()
  const { projectId, documentId } = useWorkspace()
  const { selectedId, select } = useSelection()
  const [tab, setTab] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [pending, setPending] = useState(0)
  const [query, setQuery] = useState<GridQuery>(EMPTY_QUERY)

  const projectDocuments = useProjectDocuments(projectId)
  const currentId = selectedId ?? documentId ?? projectDocuments.data?.[0]?.id ?? null
  const detail = useDocument(currentId)
  const doc = detail.data ?? null
  const create = useCreateDocument()
  const remove = useDeleteResource('documents')
  const templates = useQuoteTemplates()
  const saveAsTemplate = useSaveDocumentAsTemplate()
  const [chooserOpen, setChooserOpen] = useState(false)

  const activeTab = tab ?? (currentId ? 'Détail' : 'Explorateur')
  const explorer = useResourceList<DocumentDetail>('documents', useDebounced(query, 250), {}, activeTab === 'Explorateur')

  // Ouvrir un document en fait le document courant, et son projet le projet courant.
  useEffect(() => {
    if (doc) {
      if (doc.project_id !== projectId) {
        setProject(doc.project_id)
      }
      setDocument(doc.id)
    }
  }, [doc, projectId])

  function open(id: number) {
    select(id)
    setTab('Détail')
    setSaveState('idle')
  }

  function createQuote() {
    if (!projectId) {
      toast("Choisissez d'abord un projet dans la barre du haut.", 'info')
      return
    }
    if ((templates.data?.length ?? 0) > 0) {
      setChooserOpen(true)
      return
    }
    createWithTemplate(null)
  }

  function createWithTemplate(templateId: number | null) {
    if (!projectId) {
      return
    }
    setChooserOpen(false)
    create.mutate(
      { projectId, type: 'devis', templateId },
      {
        onSuccess: (created) => {
          toast(`Devis ${created.number} créé.`, 'success')
          open(created.id)
        },
        onError: () => toast("Le devis n'a pas pu être créé.", 'error'),
      },
    )
  }

  function saveTemplate() {
    if (!doc) {
      return
    }
    const name = window.prompt('Nom du modèle de devis :', doc.title ?? '')
    if (!name?.trim()) {
      return
    }
    saveAsTemplate.mutate(
      { documentId: doc.id, name: name.trim() },
      {
        onSuccess: (template) => toast(`Modèle « ${template.name} » créé avec ${template.steps?.length ?? 0} étapes.`, 'success'),
        onError: () => toast("Le modèle n'a pas pu être créé.", 'error'),
      },
    )
  }

  function onDelete() {
    if (!doc || !window.confirm(`Supprimer le document ${doc.number} ?`)) {
      return
    }
    remove.mutate(doc.id, {
      onSuccess: () => {
        toast('Document supprimé.', 'success')
        setDocument(null)
        select(null)
        setTab(null)
      },
    })
  }

  const positions = doc?.steps?.reduce((sum, step) => sum + step.positions.length, 0) ?? null
  const status = pending > 0 ? SAVE_LABELS.saving : SAVE_LABELS[saveState]
  const showDocument = activeTab !== 'Explorateur'

  return (
    <>
    <TemplateChooser open={chooserOpen} onClose={() => setChooserOpen(false)} onChoose={createWithTemplate} busy={create.isPending} />
    <Workspace
      asideWidth={320}
      tabLabel={doc ? `${DOCUMENT_TYPE_LABELS[doc.type]} N° ${doc.number}` : 'Documents'}
      entries={showDocument ? positions : (explorer.data?.meta.total ?? null)}
      totals={doc && showDocument ? `Net : ${fmtAmount(doc.total_net - doc.discount_amount)} CHF   ·   TTC : ${fmtAmount(doc.total_gross)} CHF` : undefined}
      statusRight={status}
      toolbar={
        <>
          <ToolPrimary icon="fileplus" label="Nouveau devis" onClick={createQuote} />
          <ToolSep />
          {activeTab === 'En-tête' && doc ? (
            <button type="submit" form={DOCUMENT_FORM_ID} title="Enregistrer (Ctrl+S)" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100">
              <Icon name="save" className="h-4 w-4 text-primary-600" />
            </button>
          ) : (
            <ToolButton icon="save" title="Les positions s'enregistrent automatiquement" tone="primary" disabled />
          )}
          <ToolButton icon="trash" title="Supprimer le document" tone="danger" onClick={onDelete} disabled={!doc} />
          <ToolSep />
          {doc ? <DuplicateButton documentId={doc.id} onDone={open} /> : <ToolButton icon="fileplus" title="Nouvelle version" disabled />}
          <ToolButton icon="tree" title="Enregistrer les étapes de ce devis comme modèle" onClick={saveTemplate} disabled={!doc || !doc.steps?.length} />
          {doc ? <PruneButton document={doc} /> : <ToolButton icon="filter" title="Retirer les lignes sans quantité" disabled />}
          <ToolButton icon="print" title="Aperçu avant impression et PDF" onClick={() => setTab('Aperçu')} disabled={!doc} />
          {doc && (
            <>
              <ToolSep />
              <span className="shrink-0 text-[13px] font-medium text-gray-800">{doc.number}</span>
              <Badge className={`ml-2 shrink-0 ${DOCUMENT_STATUSES[doc.status].className}`}>{DOCUMENT_STATUSES[doc.status].label}</Badge>
              {doc.project && (
                <button
                  type="button"
                  onClick={() => navigate(`/projets?id=${doc.project_id}`)}
                  className="ml-3 truncate text-[12px] text-gray-500 hover:text-primary-700 hover:underline"
                  title="Ouvrir la fiche du projet"
                >
                  {doc.project.number} · {doc.project.designation1}
                </button>
              )}
            </>
          )}
        </>
      }
      aside={
        <AsidePanel title="Devis" nav={[{ icon: 'tree', label: 'Étapes et modèles', active: true }]}>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Documents du projet</div>
          {!projectId && <p className="mt-1.5 text-[13px] text-gray-400">Choisissez un projet dans la barre du haut.</p>}
          <ul className="mt-1.5 space-y-0.5">
            {(projectDocuments.data ?? []).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                    item.id === currentId ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon name="file" className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.number}</span>
                  <span className="shrink-0 text-[12px] tabular-nums text-gray-500">{fmtAmount(item.total_gross)}</span>
                </button>
              </li>
            ))}
            {projectId && projectDocuments.data?.length === 0 && (
              <li className="text-[13px] text-gray-400">Aucun document. Créez le devis du projet.</li>
            )}
          </ul>

          {doc && (
            <div className="mt-5">
              <DocumentSteps key={doc.id} document={doc} />
            </div>
          )}
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <TabStrip tabs={TABS} active={activeTab} onChange={setTab} className="shrink-0 px-4" />

        {!showDocument ? (
          <>
            <DataGrid
              className="min-h-0 flex-1"
              columns={EXPLORER_COLUMNS}
              rows={explorer.data?.data ?? []}
              rowKey={(row) => String(row.id)}
              selectedKey={currentId ? String(currentId) : null}
              onSelect={(row) => open(row.id)}
              query={query}
              onQueryChange={(next) => setQuery({ ...next, page: 1 })}
              emptyText={explorer.isLoading ? 'Chargement…' : 'Aucun document.'}
            />
            <GridPager meta={explorer.data?.meta} onPage={(page) => setQuery({ ...query, page })} loading={explorer.isFetching} />
          </>
        ) : !doc ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-gray-500">
            <Icon name="file" className="h-8 w-8 text-gray-300" />
            <p className="font-medium text-gray-700">{detail.isLoading ? 'Chargement du document…' : 'Aucun devis ouvert.'}</p>
            {!detail.isLoading && (
              <p className="max-w-md text-[13px]">
                {projectId
                  ? 'Créez le devis du projet : ses étapes serviront ensuite aux rapports journaliers, à la régie et à la facture.'
                  : "Choisissez un projet dans la barre du haut, ou ouvrez un document depuis l'explorateur."}
              </p>
            )}
          </div>
        ) : (
          <DocumentBody
            key={doc.id}
            document={doc}
            tab={activeTab}
            onStateChange={setSaveState}
            onSaving={(saving) => setPending((value) => Math.max(0, value + (saving ? 1 : -1)))}
          />
        )}
      </div>
    </Workspace>
    </>
  )
}

/** Étapes du document (les actions sont liées à l'identifiant du document). */
function DocumentSteps({ document }: { document: DocumentDetail }) {
  const actions = useDocumentActions(document.id)
  return <StepsPanel document={document} actions={actions} />
}

interface DocumentBodyProps {
  document: DocumentDetail
  tab: string
  onStateChange: (state: SaveState) => void
  onSaving: (saving: boolean) => void
}

function DocumentBody({ document, tab, onStateChange, onSaving }: DocumentBodyProps) {
  const actions = useDocumentActions(document.id)

  if (tab === 'En-tête') {
    return <DocumentHeaderForm document={document} actions={actions} onStateChange={onStateChange} />
  }
  if (tab === 'Récapitulation') {
    return <DocumentRecap document={document} />
  }
  if (tab === 'Aperçu') {
    return <DocumentPreview document={document} />
  }
  return <DocumentEditor document={document} actions={actions} onSaving={onSaving} />
}

/** Retire d'un coup toutes les lignes du devis restées sans quantité (articles du modèle non retenus). */
function PruneButton({ document }: { document: DocumentDetail }) {
  const actions = useDocumentActions(document.id)
  const count = (document.steps ?? []).flatMap((step) => step.positions).filter((position) => position.kind === 'item' && position.quantity === null).length

  function prune() {
    if (!window.confirm(`Retirer les ${count} ligne${count > 1 ? 's' : ''} sans quantité de tout le devis ?\n\nLes lignes à garder sans quantité (prix horaire indicatif, par exemple) seront retirées aussi : utilisez plutôt le bouton de chaque étape pour les conserver.`)) {
      return
    }
    actions
      .prunePositions()
      .then((removed) => toast(`${removed} ligne${removed > 1 ? 's' : ''} retirée${removed > 1 ? 's' : ''}.`, 'success'))
      .catch(() => toast("Les lignes n'ont pas pu être retirées.", 'error'))
  }

  return <ToolButton icon="filter" title={count ? `Retirer les ${count} lignes sans quantité du devis` : 'Aucune ligne sans quantité'} onClick={prune} disabled={count === 0} />
}

function DuplicateButton({ documentId, onDone }: { documentId: number; onDone: (id: number) => void }) {
  const actions = useDocumentActions(documentId)
  const [busy, setBusy] = useState(false)

  async function duplicate() {
    setBusy(true)
    try {
      const copy = await actions.duplicate()
      toast(`Nouvelle version ${copy.number} créée.`, 'success')
      onDone(copy.id)
    } catch {
      toast('La duplication a échoué.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void duplicate()}
      disabled={busy}
      title="Créer une nouvelle version de ce devis (étapes et positions reprises)"
      className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-40"
    >
      <Icon name="fileplus" className="h-4 w-4 text-gray-500" />
      Nouvelle version
    </button>
  )
}
