import { DEMO_DOCUMENTS, DEMO_PROJECTS } from '@/lib/demo'
import { setDocument, setProject, useWorkspace } from '@/lib/workspaceStore'
import { Icon } from '@/components/icons'

/** Barre bleue « Projet / Document » : contexte courant, repris par les pages. */
export default function ContextBar() {
  const { projectId, documentId } = useWorkspace()
  const documents = DEMO_DOCUMENTS.filter((doc) => doc.projectId === projectId)

  return (
    <div className="flex h-7 items-center gap-1.5 bg-bb-blue px-2 text-[12px] text-white">
      <span>Projet</span>
      <select
        value={projectId ?? ''}
        onChange={(event) => setProject(event.target.value || null)}
        className="h-[20px] w-[340px] border border-gray-400 bg-white px-1 text-[12px] text-black outline-none"
      >
        <option value="">— aucun projet sélectionné —</option>
        {DEMO_PROJECTS.map((project) => (
          <option key={project.id} value={project.id}>
            {project.number} - {project.designation1}
          </option>
        ))}
      </select>
      <button type="button" title="Filtre projets" className="flex items-center rounded px-1 hover:bg-white/20">
        <Icon name="filter" className="h-3.5 w-3.5" />
        <Icon name="chevrondown" className="h-3 w-3" />
      </button>

      <span className="ml-2 border-l border-white/40 pl-2">Document</span>
      <select
        value={documentId ?? ''}
        onChange={(event) => setDocument(event.target.value || null)}
        className="h-[20px] w-[260px] border border-gray-400 bg-white px-1 text-[12px] text-black outline-none"
      >
        <option value="">{projectId ? '— aucun document —' : ''}</option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.number} - {doc.label}
          </option>
        ))}
      </select>
      <Icon name="refresh" className="ml-1 h-4 w-4 text-green-300" />
      <span className="h-4 w-2.5 rounded-sm bg-green-400" title="Base de données connectée" />
    </div>
  )
}
