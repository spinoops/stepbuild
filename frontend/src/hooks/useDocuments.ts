import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { buildIndex } from '@/lib/searchIndex'
import type { SearchIndex } from '@/lib/searchIndex'
import { fmtAmount } from '@/lib/format'
import type { CatalogArticle, DocumentDetail, DocumentType, Paginated } from '@/types'

const itemKey = (id: number | null) => ['documents', 'item', id]

/** Document complet : en-tête, étapes, positions, totaux. */
export function useDocument(id: number | null) {
  return useQuery({
    queryKey: itemKey(id),
    queryFn: async () => (await api.get<{ data: DocumentDetail }>(`/documents/${id}`)).data.data,
    enabled: id !== null,
  })
}

/** Documents d'un projet (barre de contexte, fiche projet, panneau du devis). */
export function useProjectDocuments(projectId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['documents', 'list', 'project', projectId],
    queryFn: async () =>
      (
        await api.get<Paginated<DocumentDetail>>('/documents', {
          params: { project_id: projectId, per_page: 100, sort: 'number', dir: 'asc' },
        })
      ).data.data,
    enabled: enabled && projectId !== null,
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, type, templateId }: { projectId: number; type: DocumentType; templateId?: number | null }) =>
      (
        await api.post<{ data: DocumentDetail }>(`/projects/${projectId}/documents`, {
          type,
          // undefined = modèle par défaut ; null = devis vide ; nombre = modèle choisi
          ...(templateId === undefined ? {} : { quote_template_id: templateId }),
        })
      ).data.data,
    onSuccess: (document) => {
      queryClient.setQueryData(itemKey(document.id), document)
      void queryClient.invalidateQueries({ queryKey: ['documents', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['search-index'] })
    },
  })
}

export interface PositionPayload {
  document_step_id?: number
  catalog_article_id?: number | null
  after_id?: number | null
  kind?: 'item' | 'title' | 'text'
  code?: string | null
  description?: string
  unit?: string | null
  quantity?: number | null
  unit_price?: number | null
  cost_price?: number | null
  is_optional?: boolean
  internal_remark?: string | null
}

/** Ligne envoyée au sous-détail de prix (id présent = mise à jour, absent = création). */
export interface BreakdownLinePayload {
  id?: number
  family: number
  price_element_id: number | null
  label: string
  unit: string | null
  quantity: number
  per_dimension: boolean
  pack_size: number | null
  unit_cost: number
  markup_percent: number
  note: string | null
}

export interface BreakdownPayload {
  dimension: number | null
  dimension_unit: string | null
  price_per_dimension: boolean
  internal_remark: string | null
  lines: BreakdownLinePayload[]
  /** Reporte le prix calculé dans le prix de vente de la position. */
  apply_price?: boolean
}

type DocResponse = { data: DocumentDetail; created_position_id?: number; removed?: number }

/**
 * Actions sur un devis. Chaque appel renvoie le document complet (totaux recalculés côté serveur),
 * qui remplace directement le cache : pas de rechargement, pas d'état intermédiaire incohérent.
 */
export function useDocumentActions(documentId: number) {
  const queryClient = useQueryClient()

  return useMemo(() => {
    const base = `/documents/${documentId}`
    const apply = (response: DocResponse) => {
      queryClient.setQueryData(itemKey(documentId), response.data)
      void queryClient.invalidateQueries({ queryKey: ['documents', 'list'] })
      return response
    }

    return {
      updateHeader: async (payload: Record<string, unknown>) => apply((await api.put<DocResponse>(base, payload)).data).data,
      addStep: async (payload: { catalog_chapter_id?: number; code?: string; label?: string; with_articles?: boolean }) =>
        apply((await api.post<DocResponse>(`${base}/steps`, payload)).data).data,
      updateStep: async (id: number, payload: { code: string; label: string }) =>
        apply((await api.put<DocResponse>(`${base}/steps/${id}`, payload)).data).data,
      deleteStep: async (id: number) => apply((await api.delete<DocResponse>(`${base}/steps/${id}`)).data).data,
      reorderSteps: async (ids: number[]) => apply((await api.post<DocResponse>(`${base}/steps/reorder`, { ids })).data).data,
      addPosition: async (payload: PositionPayload) => {
        const response = apply((await api.post<DocResponse>(`${base}/positions`, payload)).data)
        void queryClient.invalidateQueries({ queryKey: ['catalog-articles', 'picker'] }) // compteur d'utilisation
        return response.created_position_id ?? null
      },
      updatePosition: async (id: number, payload: PositionPayload) =>
        apply((await api.put<DocResponse>(`${base}/positions/${id}`, payload)).data).data,
      deletePosition: async (id: number) => apply((await api.delete<DocResponse>(`${base}/positions/${id}`)).data).data,
      saveBreakdown: async (id: number, payload: BreakdownPayload) => {
        const document = apply((await api.put<DocResponse>(`${base}/positions/${id}/breakdown`, payload)).data).data
        void queryClient.invalidateQueries({ queryKey: ['price-elements'] }) // compteur d'utilisation
        return document
      },
      /** Retire les positions restées sans quantité (toute l'étape, ou tout le devis). Renvoie le nombre retiré. */
      prunePositions: async (stepId?: number) => {
        const response = apply((await api.post<DocResponse>(`${base}/positions/prune`, stepId ? { step_id: stepId } : {})).data)
        return response.removed ?? 0
      },
      reorderPositions: async (stepId: number, ids: number[]) =>
        apply((await api.post<DocResponse>(`${base}/positions/reorder`, { step_id: stepId, ids })).data).data,
      duplicate: async () => {
        const copy = (await api.post<DocResponse>(`${base}/duplicate`)).data.data
        queryClient.setQueryData(itemKey(copy.id), copy)
        void queryClient.invalidateQueries({ queryKey: ['documents', 'list'] })
        void queryClient.invalidateQueries({ queryKey: ['search-index'] })
        return copy
      },
    }
  }, [documentId, queryClient])
}

export type DocumentActions = ReturnType<typeof useDocumentActions>

export interface PickerArticle {
  id: number
  code: string
  description: string
  unit: string | null
  sale: number | null
  purchase: number | null
  chapterId: number
}

type PickerRow = [number, string, string, string | null, number | null, number | null, number, number]

/**
 * Articles du catalogue pour la saisie rapide : chargés une fois, cherchés en mémoire
 * (même moteur que Ctrl+K : sans accents, tolérant aux fautes, les plus utilisés d'abord).
 */
export function useArticlePicker() {
  return useQuery({
    queryKey: ['catalog-articles', 'picker'],
    queryFn: async (): Promise<{ index: SearchIndex; articles: Map<number, PickerArticle> }> => {
      const rows = (await api.get<{ data: PickerRow[] }>('/catalog-articles/picker')).data.data
      const articles = new Map<number, PickerArticle>()
      const items = rows.map(([id, code, description, unit, sale, purchase, usage, chapterId]) => {
        articles.set(id, { id, code, description, unit, sale, purchase, chapterId })
        const sublabel = [code, unit, sale !== null ? `${fmtAmount(sale)} CHF` : null].filter(Boolean).join(' · ')
        return [id, description, sublabel, usage, code] as [number, string, string, number, string]
      })
      return { index: buildIndex({ groups: [{ key: 'articles', title: 'Catalogue', path: '', items }] }), articles }
    },
    staleTime: 5 * 60_000,
  })
}

/** Crée un article à la volée dans le catalogue (depuis le champ de recherche d'un devis). */
export function useCreateArticleOnTheFly() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { catalog_chapter_id: number; description: string }) =>
      (await api.post<{ data: CatalogArticle }>('/catalog-articles', payload)).data.data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog-articles'] })
      void queryClient.invalidateQueries({ queryKey: ['search-index'] })
    },
  })
}
