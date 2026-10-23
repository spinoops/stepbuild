import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolMenu } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import ProjectForm, { PROJECT_FORM_ID } from '@/components/projects/ProjectForm'
import ProjectAddressesTab from '@/components/projects/ProjectAddressesTab'
import ProjectPhotosTab from '@/components/projects/ProjectPhotosTab'
import { Icon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import { SAVE_LABELS } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import { useCreateDocument, useProjectDocuments } from '@/hooks/useDocuments'
import { useSelection } from '@/hooks/useSelection'
import { useDeleteResource, useResourceItem } from '@/lib/crud'
import { canSeePrices } from '@/lib/roles'
import { fmtAmount } from '@/lib/format'
import { DOCUMENT_STATUSES, PROJECT_STATUSES } from '@/lib/status'
import { toast } from '@/lib/toast'
import { setDocument, setProject, useWorkspace } from '@/lib/workspaceStore'
import type { Project } from '@/types'

/** Projets : la fiche du projet courant (Général, Client, Adresses, Photos). Le projet se choisit dans la barre du haut. */
export default function ProjectsPage() {
  const { user } = useAuth()
  const canManage = canSeePrices(user) // admin et responsable ; l'ouvrier consulte seulement
  const { projectId: contextId } = useWorkspace()
  const { selectedId, isNew, select } = useSelection()
  const navigate = useNavigate()
  const createDocument = useCreateDocument()
  const [tab, setTab] = useState('Général')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [formVersion, setFormVersion] = useState(0)

  const remove = useDeleteResource('projects')

  // Sélection : URL, sinon projet courant de la barre de contexte.
  const currentId = isNew ? null : (selectedId ?? contextId ?? null)
  const detail = useResourceItem<Project>('projects', currentId)
  const project = isNew ? null : (detail.data ?? null)
  const documents = useProjectDocuments(project?.id ?? null, canManage)

  function openDocument(id: number) {
    if (project) {
      setProject(project.id)
    }
    setDocument(id)
    navigate(`/documents?id=${id}`)
  }

  function createQuote() {
    if (!project) {
      return
    }
    createDocument.mutate(
      { projectId: project.id, type: 'devis' },
      {
        onSuccess: (created) => {
          const count = created.steps?.length ?? 0
          toast(count ? `Devis ${created.number} créé avec ${count} étapes du modèle par défaut.` : `Devis ${created.number} créé.`, 'success')
          openDocument(created.id)
        },
        onError: () => toast("Le devis n'a pas pu être créé.", 'error'),
      },
    )
  }

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

  const tabs = ['Général', 'Client', `Adresses${project?.addresses?.length ? ` (${project.addresses.length})` : ''}`, `Photos${project?.photos?.length ? ` (${project.photos.length})` : ''}`]
  const activeTab = tabs.find((item) => item.startsWith(tab)) ?? tabs[0]

  return (
    <Workspace
      statusLeft={project ? `${project.number} · ${project.designation1}` : undefined}
      statusRight={SAVE_LABELS[saveState]}
      tabLabel="Projets"
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
            </>
          )}
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

              {canManage && (
                <>
                  <div className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Devis et documents</div>
                  <ul className="mt-1.5 space-y-1">
                    {(documents.data ?? []).map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openDocument(item.id)}
                          className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 text-left transition hover:border-primary-200 hover:bg-primary-50"
                        >
                          <Icon name="file" className="h-4 w-4 shrink-0 text-primary-600" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-gray-800">{item.number}</span>
                            <span className="block text-[11px] text-gray-400">
                              {DOCUMENT_STATUSES[item.status].label} · {fmtAmount(item.total_gross)} CHF
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {documents.data?.length === 0 && (
                    <p className="mt-1.5 text-[12px] text-gray-500">
                      Pas encore de devis. Il fixe les étapes du chantier : rapports, régie et facture en découlent.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={createQuote}
                    disabled={createDocument.isPending}
                    className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-accent-600 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40"
                  >
                    <Icon name="fileplus" className="h-4 w-4" />
                    {documents.data?.length ? 'Nouveau devis' : 'Créer le devis'}
                  </button>
                </>
              )}
            </>
          ) : (
            <p className="text-[13px] text-gray-400">{isNew ? 'Nouveau projet en cours de saisie.' : 'Aucun projet sélectionné.'}</p>
          )}
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col overflow-auto">
        {!isNew && !project && !detail.isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-gray-500">
            <Icon name="folder" className="h-8 w-8 text-gray-300" />
            <p className="font-medium text-gray-700">Aucun projet sélectionné.</p>
            <p className="max-w-md text-[13px]">
              Choisissez le projet dans la barre du haut, par la recherche instantanée (Ctrl+K)
              {canManage ? ', ou créez-en un avec « Nouveau projet ».' : '.'}
            </p>
          </div>
        ) : (
        <div className="shrink-0 bg-white px-4 pb-6 pt-1">
          <TabStrip tabs={tabs} active={activeTab} onChange={(value) => setTab(value.split(' ')[0])} />
          {(tab === 'Général' || tab === 'Client') && (
            <ProjectForm
              key={`${isNew ? 'new' : (project?.id ?? 'none')}-${formVersion}`}
              project={project}
              isNew={isNew}
              section={tab === 'Client' ? 'client' : 'general'}
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
        )}
      </div>
    </Workspace>
  )
}
