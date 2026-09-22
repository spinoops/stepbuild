import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DocumentDetail, QuoteTemplate } from '@/types'

const KEY = ['quote-templates']

/** Modèles de devis, le modèle par défaut en premier. */
export function useQuoteTemplates(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get<{ data: QuoteTemplate[] }>('/quote-templates')).data.data,
    staleTime: 60_000,
    enabled,
  })
}

export interface QuoteTemplateStepPayload {
  catalog_chapter_id: number | null
  code: string
  label: string
  with_articles: boolean
}

export interface QuoteTemplatePayload {
  name: string
  description: string | null
  is_default: boolean
  steps: QuoteTemplateStepPayload[]
}

export function useSaveQuoteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number | null; payload: QuoteTemplatePayload }) => {
      const response = id
        ? await api.put<{ data: QuoteTemplate }>(`/quote-templates/${id}`, payload)
        : await api.post<{ data: QuoteTemplate }>('/quote-templates', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteQuoteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/quote-templates/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

/** Enregistre les étapes d'un devis comme nouveau modèle. */
export function useSaveDocumentAsTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ documentId, name }: { documentId: number; name: string }) =>
      (await api.post<{ data: QuoteTemplate }>(`/documents/${documentId}/save-as-template`, { name })).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

/** Ajoute les étapes d'un modèle à un devis existant (renvoie le devis complet). */
export function useApplyQuoteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ templateId, documentId }: { templateId: number; documentId: number }) =>
      (await api.post<{ data: DocumentDetail }>(`/quote-templates/${templateId}/apply/${documentId}`)).data.data,
    onSuccess: (document) => {
      queryClient.setQueryData(['documents', 'item', document.id], document)
      void queryClient.invalidateQueries({ queryKey: ['documents', 'list'] })
    },
  })
}
