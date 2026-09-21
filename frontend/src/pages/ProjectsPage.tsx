import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import GridPager from '@/components/baubit/GridPager'
import { BbCheckbox } from '@/components/baubit/Form'
import ProjectForm, { PROJECT_FORM_ID } from '@/components/projects/ProjectForm'
import ProjectAddressesTab from '@/components/projects/ProjectAddressesTab'
import ProjectPhotosTab from '@/components/projects/ProjectPhotosTab'
import { Icon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import { useDebounced } from '@/hooks/useDebounced'
import { SAVE_LABELS } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import { useProjectStats } from '@/hooks/useProjects'
import { useSelection } from '@/hooks/useSelection'
import { EMPTY_QUERY, useDeleteResource, useResourceItem, useResourceList } from '@/lib/crud'
import type { GridQuery } from '@/lib/crud'
import { canSeePrices } from '@/lib/roles'
import { PROJECT_STATUSES } from '@/lib/status'
import { toast } from '@/lib/toast'
import { setProject, useWorkspace } from '@/lib/workspaceStore'
import type { Project, ProjectStatus } from '@/types'

const STATUSES = Object.keys(PROJECT_STATUSES) as ProjectStatus[]

const COLUMNS: GridColumn<Project>[] = [
  { key: 'number', header: 'N° de projet', value: (p) => p.number, width: 110 },
  { key: 'designation1', header: 'Désignation 1', value: (p) => p.designation1, width: 380 },
  { key: 'client', header: 'Client', value: (p) => p.client?.label ?? '', width: 200, noFilter: true },
  { key: 'street', header: 'Rue', value: (p) => `${p.street ?? ''} ${p.street_no ?? ''}`.trim(), width: 180 },
  { key: 'zip', header: 'NPA', value: (p) => p.zip, width: 70 },
  { key: 'city', header: 'Lieu', value: (p) => p.city, width: 130 },
  {
    key: 'status',
    header: 'Statut',
    value: (p) => PROJECT_STATUSES[p.status].label,
    width: 110,
    noFilter: true,
    render: (p) => <Badge className={PROJECT_STATUSES[p.status].className}>{PROJECT_STATUSES[p.status].label}</Badge>,
  },
  { key: 'contract_no', header: 'N° contrat', value: (p) => p.contract_no, width: 120 },
  {
    key: 'updated_at',
    header: 'Date mutation',
    value: (p) => p.updated_at,
    width: 140,
    noFilter: true,
    render: (p) => new Date(p.updated_at).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' }),
  },
]

/** Projets : fiche (Général, Adresses, Photos) en haut, liste colorée par statut en bas. */
export default function ProjectsPage() {
  const { user } = useAuth()
  const canManage = canSeePrices(user) // admin et responsable ; l'ouvrier consulte seulement
  const { projectId: contextId } = useWorkspace()
  const { selectedId, isNew, select } = useSelection()
  const [tab, setTab] = useState('Général')
  const [statusFilter, setStatusFilter] = useState<'' | ProjectStatus>('')
  const [onlyActive, setOnlyActive] = useState(true)
  const [templates, setTemplates] = useState(false)
  const [query, setQuery] = useState<GridQuery>(EMPTY_QUERY)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [formVersion, setFormVersion] = useState(0)

  const list = useResourceList<Project>('projects', useDebounced(query, 250), { status: statusFilter, active: onlyActive, templates })
  const rows = list.data?.data ?? []
  const stats = useProjectStats()
  const remove = useDeleteResource('projects')

  // Sélection : URL, sinon projet courant de la barre de contexte, sinon première ligne.
  const currentId = isNew ? null : (selectedId ?? contextId ?? rows[0]?.id ?? null)
  const detail = useResourceItem<Project>('projects', currentId)
  const project = isNew ? null : (detail.data ?? rows.find((row) => row.id === currentId) ?? null)

  function open(id: number | 'new' | null) {
    select(id)
    setSaveState('idle')
    if (typeof id === 'number') {
      setProject(id)
    }
    if (id === 'new') {
      setTab('Général')
    }
  }

  function onDelete() {
    if (!project || !window.confirm(`Supprimer le projet ${project.number} « ${project.designation1} » ?`)) {
      return
    }
    remove.mutate(project.id, {
      onSuccess: () => {
        toast('Projet supprimé.', 'success')
        setProject(null)
        select(null)
      },
    })
  }

  const tabs = ['Général', `Adresses${project?.addresses?.length ? ` (${project.addresses.length})` : ''}`, `Photos${project?.photos?.length ? ` (${project.photos.length})` : ''}`]
  const activeTab = tabs.find((item) => item.startsWith(tab)) ?? tabs[0]
  const chip = (active: boolean) =>
    `flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition ${
      active ? 'bg-anthracite-800 font-medium text-white' : 'text-gray-600 hover:bg-gray-100'
    }`

  return (
    <Workspace
      entries={list.data?.meta.total ?? null}
      statusRight={SAVE_LABELS[saveState]}
      tabLabel={templates ? 'Projets - Modèles' : 'Projets'}
      asideWidth={280}
      toolbar={
        <>
          {canManage && (
            <>
              <StandardTools
                newLabel="Nouveau projet"
                onNew={() => open('new')}
                formId={PROJECT_FORM_ID}
                onUndo={() => {
                  setFormVersion((value) => value + 1)
                  setSaveState('idle')
                }}
                onDelete={onDelete}
                canDelete={Boolean(project)}
              />
              <ToolMenu icon="export" label="Export" />
              <ToolSep />
            </>
          )}
          <button type="button" className={chip(statusFilter === '')} onClick={() => setStatusFilter('')}>
            Tous
            <span className="opacity-70">{stats.data?.total ?? ''}</span>
          </button>
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={chip(statusFilter === status)}
              onClick={() => {
                setStatusFilter(statusFilter === status ? '' : status)
                setQuery({ ...query, page: 1 })
              }}
            >
              <span className={`h-2 w-2 rounded-full border border-black/10 ${PROJECT_STATUSES[status].rowClass.split(' ')[0]}`} />
              {PROJECT_STATUSES[status].label}
              <span className="opacity-70">{stats.data?.data[status] ?? ''}</span>
            </button>
          ))}
          <ToolSep />
          <BbCheckbox label="Seulement actifs" checked={onlyActive} onChange={(event) => setOnlyActive(event.target.checked)} />
          <BbCheckbox label="Modèles" checked={templates} onChange={(event) => setTemplates(event.target.checked)} className="ml-3" />
        </>
      }
      aside={
        <AsidePanel title="Projet" nav={[{ icon: 'folder', label: 'Résumé du projet', active: true }]}>
          {project ? (
            <>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {project.cover_url ? (
                  <img src={project.cover_url} alt="" className="h-36 w-full object-cover" />
                ) : (
                  <div className="flex h-24 items-center justify-center text-gray-300">
                    <Icon name="image" className="h-8 w-8" />
                  </div>
                )}
                <div className="p-3">
                  <div className="text-[12px] font-semibold text-gray-400">{project.number}</div>
                  <div className="text-[13px] font-medium text-gray-800">{project.designation1}</div>
                  <Badge className={`mt-1.5 ${PROJECT_STATUSES[project.status].className}`}>{PROJECT_STATUSES[project.status].label}</Badge>
                </div>
              </div>

              <div className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Client</div>
              {project.client ? (
                <div className="mt-1.5 rounded-lg border border-gray-200 p-3 text-[13px]">
                  {canManage ? (
                    <Link to={`/clients?id=${project.client.id}`} className="font-medium text-primary-700 hover:underline">
                      {project.client.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-800">{project.client.label}</span>
                  )}
                  {project.client.city && <div className="text-gray-500">{project.client.city}</div>}
                  {project.client.phone && <div className="mt-1 text-gray-600">{project.client.phone}</div>}
                </div>
              ) : (
                <p className="mt-1.5 text-[13px] text-gray-400">Aucun client lié.</p>
              )}

              <div className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Chantier</div>
              <p className="mt-1.5 text-[13px] text-gray-700">
                {project.street} {project.street_no}
                <br />
                {project.zip} {project.city}
              </p>

              <div className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Devis</div>
              <p className="mt-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-[12px] text-gray-500">
                Le devis se créera ici, juste après le projet : ses étapes serviront aux rapports journaliers, à la régie
                et à la facture (phase 3).
              </p>
            </>
          ) : (
            <p className="text-[13px] text-gray-400">{isNew ? 'Nouveau projet en cours de saisie.' : 'Aucun projet sélectionné.'}</p>
          )}
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-gray-200 bg-white px-4 pb-4 pt-1">
          <TabStrip tabs={tabs} active={activeTab} onChange={(value) => setTab(value.split(' ')[0])} />
          {tab === 'Général' && (
            <ProjectForm
              key={`${isNew ? 'new' : (project?.id ?? 'none')}-${formVersion}`}
              project={project}
              isNew={isNew}
              readOnly={!canManage || (!isNew && !project)}
              onStateChange={setSaveState}
              onCreated={(created) => open(created.id)}
            />
          )}
          {tab === 'Adresses' &&
            (project ? (
              <ProjectAddressesTab key={project.id} project={project} readOnly={!canManage} />
            ) : (
              <p className="mt-4 h-[300px] text-[13px] text-gray-400">Enregistrez d'abord le projet pour lui ajouter des adresses.</p>
            ))}
          {tab === 'Photos' &&
            (project ? (
              <ProjectPhotosTab key={project.id} project={project} readOnly={!canManage} />
            ) : (
              <p className="mt-4 h-[300px] text-[13px] text-gray-400">Enregistrez d'abord le projet pour lui ajouter des photos.</p>
            ))}
        </div>

        <DataGrid
          className="min-h-0 flex-1"
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => String(row.id)}
          rowClass={(row) => (row.is_active ? PROJECT_STATUSES[row.status].rowClass : 'bg-white text-gray-400')}
          selectedKey={currentId ? String(currentId) : null}
          onSelect={(row) => open(row.id)}
          query={query}
          onQueryChange={(next) => setQuery({ ...next, page: 1 })}
          emptyText={list.isLoading ? 'Chargement…' : canManage ? 'Aucun projet. Cliquez sur « Nouveau projet ».' : 'Aucun projet.'}
        />
        <GridPager meta={list.data?.meta} onPage={(page) => setQuery({ ...query, page })} loading={list.isFetching} />
      </div>
    </Workspace>
  )
}
