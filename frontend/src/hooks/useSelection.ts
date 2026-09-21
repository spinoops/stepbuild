import { useSearchParams } from 'react-router-dom'

/**
 * Sélection d'une fiche portée par l'URL (?id=12 ou ?id=new) : la recherche globale
 * peut ainsi ouvrir directement un élément, et le bouton « précédent » fonctionne.
 */
export function useSelection() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('id')
  const isNew = raw === 'new'
  const selectedId = raw && !isNew && Number.isFinite(Number(raw)) ? Number(raw) : null

  function select(id: number | 'new' | null) {
    setParams(id === null ? {} : { id: String(id) }, { replace: true })
  }

  return { selectedId, isNew, select }
}
