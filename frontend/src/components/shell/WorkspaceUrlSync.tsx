import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { setProject, useWorkspace } from '@/lib/workspaceStore'

/**
 * Le projet courant de la barre de contexte est reflété dans l'URL (`?projet=12`) : un rechargement,
 * un lien collé ou le bouton Retour retrouvent le même chantier. Règles :
 * - au chargement, l'URL fait foi ;
 * - un changement dans la barre met l'URL à jour (ou retire le paramètre) ;
 * - une page ouverte sans le paramètre (lien du menu, onglet) le reçoit du projet courant ;
 * - sur la page Projets, c'est `?id=` qui désigne le projet, le paramètre n'y est pas ajouté.
 */
export default function WorkspaceUrlSync() {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const { projectId } = useWorkspace()
  const fromUrl = Number(params.get('projet')) || null
  const previous = useRef<{ store: number | null; url: number | null } | null>(null)

  useEffect(() => {
    const writeUrl = (id: number | null) => {
      const next = new URLSearchParams(params)
      if (id === null) {
        next.delete('projet')
      } else {
        next.set('projet', String(id))
      }
      if (next.toString() !== params.toString()) {
        setParams(next, { replace: true })
      }
    }

    if (previous.current === null) {
      previous.current = { store: projectId, url: fromUrl }
      if (fromUrl !== null && fromUrl !== projectId) {
        setProject(fromUrl)
      }
      return
    }

    const storeChanged = previous.current.store !== projectId
    previous.current = { store: projectId, url: fromUrl }

    if (storeChanged) {
      if (pathname !== '/projets' || projectId === null) {
        writeUrl(projectId)
      }
    } else if (fromUrl !== null && fromUrl !== projectId) {
      setProject(fromUrl)
    } else if (fromUrl === null && projectId !== null && pathname !== '/projets') {
      writeUrl(projectId)
    }
  }, [projectId, fromUrl, pathname, params, setParams])

  return null
}
