import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LinePayload } from '@/lib/breakdown'
import type { BreakdownTemplate } from '@/types'

/** Liste complète (légère : sans les lignes), chargée une fois et filtrée en mémoire. */
export function useBreakdownTemplates(enabled = true) {
  return useQuery({
    queryKey: ['breakdown-templates', 'list'],
    queryFn: async () => (await api.get<{ data: BreakdownTemplate[] }>('/breakdown-templates')).data.data,
    staleTime: 5 * 60_000,
    enabled,
  })
}

export function useBreakdownTemplate(id: number | null) {
  return useQuery({
    queryKey: ['breakdown-templates', 'item', id],
    queryFn: async () => (await api.get<{ data: BreakdownTemplate }>(`/breakdown-templates/${id}`)).data.data,
    enabled: id !== null,
  })
}

/** Charge un modèle avec ses lignes et compte son utilisation (les plus utilisés remontent). */
export async function fetchTemplateForUse(id: number): Promise<BreakdownTemplate> {
  return (await api.post<{ data: BreakdownTemplate }>(`/breakdown-templates/${id}/used`)).data.data
}

export interface BreakdownTemplatePayload {
  group?: string | null
  name?: string
  catalog_article_id?: number | null
  dimension?: number | null
  dimension_unit?: string | null
  price_per_dimension?: boolean
  note?: string | null
  lines?: LinePayload[]
}

export function useSaveBreakdownTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number | null; payload: BreakdownTemplatePayload }) =>
      (id
        ? await api.put<{ data: BreakdownTemplate }>(`/breakdown-templates/${id}`, payload)
        : await api.post<{ data: BreakdownTemplate }>('/breakdown-templates', payload)
      ).data.data,
    onSuccess: (template) => {
      queryClient.setQueryData(['breakdown-templates', 'item', template.id], template)
      void queryClient.invalidateQueries({ queryKey: ['breakdown-templates', 'list'] })
    },
  })
}

export function useDeleteBreakdownTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/breakdown-templates/${id}`)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['breakdown-templates'] }),
  })
}
