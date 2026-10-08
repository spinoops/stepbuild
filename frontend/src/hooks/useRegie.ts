import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { RegieLine, RegieReport, RegieTotals, ReportStatus } from '@/types'

export interface RegieFilters {
  project_id?: number | null
  status?: ReportStatus | ''
  from?: string
  to?: string
  collaborator_id?: number | null
  all?: boolean
}

export interface RegieResponse {
  data: RegieLine[]
  reports: RegieReport[]
  totals: RegieTotals
}

const listKey = (filters: RegieFilters) => ['regie', 'lines', filters]

/** Lignes de régie (heures et ressources) des rapports, avec les trois niveaux de prix. */
export function useRegieLines(filters: RegieFilters, enabled = true) {
  const params: Record<string, string | number> = {}
  if (filters.project_id) params.project_id = filters.project_id
  if (filters.status) params.status = filters.status
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.collaborator_id) params.collaborator_id = filters.collaborator_id
  if (filters.all) params.all = 1

  return useQuery({
    queryKey: listKey(filters),
    queryFn: async () => (await api.get<RegieResponse>('/regie/lines', { params })).data,
    placeholderData: keepPreviousData,
    enabled,
  })
}

export interface RegieLinePayload {
  cost_price?: number | null
  regie_price?: number | null
  client_price?: number | null
}

interface UpdateResponse {
  data: RegieLine
  report: { id: number; total_amount: number; total_regie: number; total_client: number }
}

/**
 * Modifie un niveau de prix d'une ligne. La ligne renvoyée remplace celle du cache de la liste courante,
 * et les totaux sont recalculés localement (pas de rechargement).
 */
export function useUpdateRegieLine(filters: RegieFilters) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ line, payload }: { line: RegieLine; payload: RegieLinePayload }) =>
      (await api.put<UpdateResponse>(`/regie/lines/${line.kind}/${line.id}`, payload)).data,
    onSuccess: (response) => {
      queryClient.setQueryData<RegieResponse>(listKey(filters), (current) => {
        if (!current) return current
        const data = current.data.map((line) => (line.kind === response.data.kind && line.id === response.data.id ? response.data : line))
        return {
          data,
          reports: current.reports.map((report) => (report.id === response.report.id ? { ...report, ...response.report } : report)),
          totals: {
            hours: data.filter((line) => line.kind === 'hour').reduce((sum, line) => sum + line.quantity, 0),
            cost: data.reduce((sum, line) => sum + line.cost_amount, 0),
            regie: data.reduce((sum, line) => sum + line.regie_amount, 0),
            client: data.reduce((sum, line) => sum + line.client_amount, 0),
          },
        }
      })
      void queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}

/** Réapplique les tarifs actuels aux rapports non facturés du projet (ou aux rapports donnés). */
export function useApplyTariffs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { project_id?: number; report_ids?: number[] }) =>
      (await api.post<{ updated: number }>('/regie/apply-tariffs', payload)).data.updated,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['regie'] })
      void queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}
