import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProjectDocuments } from '@/hooks/useDocuments'
import { useProjectOptions } from '@/hooks/useProjects'
import { canSeePrices } from '@/lib/roles'
import { useAuth } from '@/auth/AuthContext'
import { DOCUMENT_STATUSES, DOCUMENT_TYPE_LABELS, PROJECT_STATUSES } from '@/lib/status'
import { setDocument, setProject, useWorkspace } from '@/lib/workspaceStore'
import { Icon } from '@/components/icons'
import ProjectPickerDialog from '@/components/shell/ProjectPickerDialog'
import DocumentPickerDialog from '@/components/shell/DocumentPickerDialog'

const FIELD =
  'flex h-8 items-center gap-2 rounded-md border border-white/10 bg-white px-2.5 text-left text-[13px] text-gray-800 outline-none transition hover:border-primary-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-300/40 disabled:cursor-default disabled:border-white/10 disabled:bg-white/10 disabled:text-gray-400'

/**
 * Barre de contexte « Projet / Document » : le projet courant est repris par les pages. Chaque champ
 * ouvre une fenêtre de choix avec recherche et filtres (statut, type), comme l'explorateur BauBit.
 */
export default function ContextBar() {
  const { user } = useAuth()
  const canManage = canSeePrices(user) // les documents contiennent des prix : jamais pour l'ouvrier
  const { projectId, documentId } = useWorkspace()
  const projects = useProjectOptions()
  const documents = useProjectDocuments(projectId, canManage)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [picking, setPicking] = useState<'project' | 'document' | null>(null)
  const current = projects.data?.find((project) => project.id === projectId)
  const currentDocument = documents.data?.find((item) => item.id === documentId)

  function chooseProject(id: number | null) {
    setProject(id)
    // Sur la page Projets, changer de projet courant ouvre aussi sa fiche.
    if (pathname === '/projets') {
      navigate(id ? `/projets?id=${id}` : '/projets', { replace: true })
    }
  }

  return (
    <div className="flex h-11 items-center gap-2 border-b border-gray-200 bg-anthracite-800 px-3">
      <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
        <Icon name="folder" className="h-4 w-4 text-gray-300" />
        Projet
      </span>
      <button type="button" onClick={() => setPicking('project')} title="Choisir le projet courant (recherche et filtres)" className={`${FIELD} w-[420px]`}>
        <span className="min-w-0 flex-1 truncate">
          {current ? (
            <>
              <span className="font-medium">{current.number}</span> · {current.designation1}
            </>
          ) : (
            <span className="text-gray-500">{projects.isLoading ? 'Chargement…' : 'Aucun projet sélectionné'}</span>
          )}
        </span>
        <Icon name="chevrondown" className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      </button>
      {current && (
        <>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PROJECT_STATUSES[current.status].className}`}>
            {PROJECT_STATUSES[current.status].label}
          </span>
          {pathname !== '/projets' && (
            <button
              type="button"
              onClick={() => navigate(`/projets?id=${current.id}`)}
              title="Ouvrir la fiche du projet"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          )}
        </>
      )}

      <span className="ml-3 flex items-center gap-1.5 border-l border-white/15 pl-3 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
        <Icon name="file" className="h-4 w-4 text-gray-300" />
        Document
      </span>
      <button
        type="button"
        disabled={!canManage || !projectId}
        onClick={() => setPicking('document')}
        title="Choisir le document courant (filtres par type et statut)"
        className={`${FIELD} w-[260px]`}
      >
        <span className="min-w-0 flex-1 truncate">
          {currentDocument ? (
            <>
              <span className="font-medium">{currentDocument.number}</span>
              <span className="text-gray-500"> · {DOCUMENT_TYPE_LABELS[currentDocument.type]}</span>
            </>
          ) : (
            <span className="text-gray-500">
              {!canManage ? 'Réservé à la gestion' : !projectId ? 'Choisir d’abord un projet' : documents.data?.length ? 'Aucun document ouvert' : 'Aucun document'}
            </span>
          )}
        </span>
        <Icon name="chevrondown" className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      </button>
      {currentDocument && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DOCUMENT_STATUSES[currentDocument.status].className}`}>
          {DOCUMENT_STATUSES[currentDocument.status].label}
        </span>
      )}

      <span className="ml-auto flex items-center gap-1.5 text-[12px] text-gray-400">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Connecté
      </span>

      <ProjectPickerDialog open={picking === 'project'} currentId={projectId} onClose={() => setPicking(null)} onPick={(project) => chooseProject(project.id)} />
      <DocumentPickerDialog
        open={picking === 'document'}
        projectId={projectId}
        currentId={documentId}
        onClose={() => setPicking(null)}
        onPick={(document) => {
          setDocument(document.id)
          navigate(`/documents?id=${document.id}`)
        }}
      />
    </div>
  )
}
