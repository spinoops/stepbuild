import { DEMO_DOCUMENTS, DEMO_PROJECTS } from '@/lib/demo'
import { setDocument, setProject, useWorkspace } from '@/lib/workspaceStore'
import { Icon } from '@/components/icons'

const SELECT =
  'h-8 rounded-md border border-gray-200 bg-white px-2.5 text-[13px] text-gray-800 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100'

/** Barre de contexte « Projet / Document » : le projet courant est repris par les pages. */
export default function ContextBar() {
  const { projectId, documentId } = useWorkspace()
  const documents = DEMO_DOCUMENTS.filter((doc) => doc.projectId === projectId)

  return (
    <div className="flex h-11 items-center gap-2 border-b border-gray-200 bg-white px-3">
      <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
        <Icon name="folder" className="h-4 w-4 text-primary-600" />
        Projet
      </span>
      <select
        value={projectId ?? ''}
        onChange={(event) => setProject(event.target.value || null)}
        className={`${SELECT} w-[380px]`}
      >
        <option value="">Aucun projet sélectionné</option>
        {DEMO_PROJECTS.map((project) => (
          <option key={project.id} value={project.id}>
            {project.number} · {project.designation1}
          </option>
        ))}
      </select>
      <button
        type="button"
        title="Filtrer les projets"
        className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
      >
        <Icon name="filter" className="h-4 w-4" />
      </button>

      <span className="ml-3 flex items-center gap-1.5 border-l border-gray-200 pl-3 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
        <Icon name="file" className="h-4 w-4 text-primary-600" />
        Document
      </span>
      <select
        value={documentId ?? ''}
        onChange={(event) => setDocument(event.target.value || null)}
        disabled={!projectId}
        className={`${SELECT} w-[300px] disabled:bg-gray-50 disabled:text-gray-400`}
      >
        <option value="">{projectId ? 'Aucun document' : 'Choisir d’abord un projet'}</option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.label}
          </option>
        ))}
      </select>

      <span className="ml-auto flex items-center gap-1.5 text-[12px] text-gray-500">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Connecté
      </span>
    </div>
  )
}
