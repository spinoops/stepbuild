import { useSyncExternalStore } from 'react'
import type { PickerArticle } from '@/hooks/useDocuments'
import type { CatalogChapter } from '@/types'

/**
 * Glisser-déposer du catalogue (panneau de gauche) vers la feuille du devis.
 * Le navigateur ne laisse pas lire `dataTransfer` pendant le survol : l'élément glissé est
 * donc gardé ici, en mémoire, le temps du glissement.
 */
export type CatalogDrag = { kind: 'article'; article: PickerArticle } | { kind: 'chapter'; chapter: CatalogChapter }

let current: CatalogDrag | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function startCatalogDrag(drag: CatalogDrag): void {
  current = drag
  emit()
}

export function endCatalogDrag(): void {
  if (current) {
    current = null
    emit()
  }
}

export function getCatalogDrag(): CatalogDrag | null {
  return current
}

/** Prend l'élément glissé (et termine le glissement) : au dépôt, un seul gestionnaire le reçoit. */
export function takeCatalogDrag(): CatalogDrag | null {
  const drag = current
  endCatalogDrag()
  return drag
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Élément du catalogue en cours de glissement (réactif), ou null. */
export function useCatalogDrag(): CatalogDrag | null {
  return useSyncExternalStore(subscribe, getCatalogDrag, () => null)
}
