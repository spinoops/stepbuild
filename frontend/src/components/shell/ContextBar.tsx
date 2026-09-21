import { useLocation, useNavigate } from 'react-router-dom'
import { useProjectDocuments } from '@/hooks/useDocuments'
import { useProjectOptions } from '@/hooks/useProjects'
import { canSeePrices } from '@/lib/roles'
import { useAuth } from '@/auth/AuthContext'
import { PROJECT_STATUSES } from '@/lib/status'
import { setDocument, setProject, useWorkspace } from '@/lib/workspaceStore'
import { Icon } from '@/components/icons'

const SELECT =
  'h-8 rounded-md border border-white/10 bg-white px-2.5 text-[13px] text-gray-800 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-300/40'

/** Barre de contexte « Projet / Document » : le projet courant est repris par les pages. */
export default function ContextBar() {
  const { user } = useAuth()
  const canManage = canSeePrices(user) // les documents contiennent des prix : jamais pour l'ouvrier
  const { projectId, documentId } = useWorkspace()
  const projects = useProjectOptions()
  const documents = useProjectDocuments(projectId, canManage)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const current = projects.data?.find((project) => project.id === projectId)

  function onChange(value: string) {
    const id = value ? Number(value) : null
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
      <select value={projectId ?? ''} onChange={(event) => onChange(event.target.value)} className={`${SELECT} w-[420px]`}>
        <option value="">{projects.isLoading ? 'Chargement…' : 'Aucun projet sélectionné'}</option>
        {(projects.data ?? []).map((project) => (
          <option key={project.id} value={project.id}>
            {project.number} · {project.designation1}
          </option>
        ))}
      </select>
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
      <select
        value={documentId ?? ''}
        disabled={!canManage || !projectId}
        onChange={(event) => {
          const id = event.target.value ? Number(event.target.value) : null
          setDocument(id)
          navigate(id ? `/documents?id=${id}` : '/documents')
        }}
        className={`${SELECT} w-[260px] disabled:border-white/10 disabled:bg-white/10 disabled:text-gray-400`}
      >
        <option value="">
          {!canManage ? 'Réservé à la gestion' : !projectId ? 'Choisir d’abord un projet' : documents.data?.length ? 'Aucun document ouvert' : 'Aucun document'}
        </option>
        {(documents.data ?? []).map((item) => (
          <option key={item.id} value={item.id}>
            {item.number}
          </option>
        ))}
      </select>

      <span className="ml-auto flex items-center gap-1.5 text-[12px] text-gray-400">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Connecté
      </span>
    </div>
  )
}
