import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TreeNode } from '@/components/baubit/Tree'
import type { CatalogChapter } from '@/types'

/** Chapitres du catalogue (= modèles d'étapes), chargés une fois. */
export function useCatalogChapters() {
  return useQuery({
    queryKey: ['catalog-chapters'],
    queryFn: async () => (await api.get<{ data: CatalogChapter[] }>('/catalog-chapters')).data.data,
    staleTime: 60_000,
  })
}

/** Arborescence « code - libellé » des chapitres et sous-chapitres, pour le composant Tree. */
export function useChapterTree(chapters: CatalogChapter[] | undefined): TreeNode[] {
  return useMemo(() => {
    const list = chapters ?? []
    const label = (chapter: CatalogChapter) => `${chapter.code} - ${chapter.label}`
    return list
      .filter((chapter) => chapter.parent_id === null)
      .map((chapter) => ({
        id: String(chapter.id),
        label: label(chapter),
        children: list.filter((child) => child.parent_id === chapter.id).map((child) => ({ id: String(child.id), label: label(child) })),
      }))
  }, [chapters])
}
