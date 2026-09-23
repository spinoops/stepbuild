import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { gridParams } from '@/lib/crud'
import type { GridQuery } from '@/lib/crud'
import type { Collaborator, DailyReport, Paginated, WorkType } from '@/types'

const itemKey = (id: number | null) => ['daily-reports', 'item', id]

export type ReportFilters = {
  project_id?: number | null
  status?: string | null
  month?: string | null
  collaborator_id?: number | null
}

/** Liste paginée des rapports (grille du panneau Aperçu). */
export function useDailyReports(query: GridQuery, filters: ReportFilters, enabled = true) {
  const params = gridParams(query, filters)
  return useQuery({
    queryKey: ['daily-reports', 'list', params],
    queryFn: async () => (await api.get<Paginated<DailyReport>>('/daily-reports', { params })).data,
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Rapport complet : en-tête, étapes du devis, heures, ressources, fichiers. */
export function useDailyReport(id: number | null) {
  return useQuery({
    queryKey: itemKey(id),
    queryFn: async () => (await api.get<{ data: DailyReport }>(`/daily-reports/${id}`)).data.data,
    enabled: id !== null,
  })
}

export function useCreateDailyReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, date }: { projectId: number; date?: string }) =>
      (await api.post<{ data: DailyReport }>(`/projects/${projectId}/daily-reports`, date ? { date } : {})).data.data,
    onSuccess: (report) => {
      queryClient.setQueryData(itemKey(report.id), report)
      void queryClient.invalidateQueries({ queryKey: ['daily-reports', 'list'] })
    },
  })
}

export interface ReportHeaderPayload {
  date?: string
  document_id?: number | null
  status?: string
  is_regie?: boolean
  responsible_id?: number | null
  remark?: string | null
  events?: string | null
  weather?: string | null
  temp_min?: number | null
  temp_max?: number | null
}

export interface ReportItemPayload {
  family?: number
  document_step_id?: number | null
  price_element_id?: number | null
  label?: string
  unit?: string | null
  quantity?: number
  unit_cost?: number | null
  note?: string | null
}

type ReportResponse = { data: DailyReport; created_item_id?: number }

/**
 * Actions sur un rapport. Chaque appel renvoie le rapport complet (totaux recalculés côté serveur)
 * qui remplace le cache, comme pour le devis.
 */
export function useDailyReportActions(reportId: number) {
  const queryClient = useQueryClient()

  return useMemo(() => {
    const base = `/daily-reports/${reportId}`
    const apply = (response: ReportResponse) => {
      queryClient.setQueryData(itemKey(reportId), response.data)
      void queryClient.invalidateQueries({ queryKey: ['daily-reports', 'list'] })
      return response
    }

    return {
      updateHeader: async (payload: ReportHeaderPayload) => apply((await api.put<ReportResponse>(base, payload)).data).data,
      remove: async () => {
        await api.delete(base)
        queryClient.removeQueries({ queryKey: itemKey(reportId) })
        void queryClient.invalidateQueries({ queryKey: ['daily-reports', 'list'] })
      },
      setCell: async (payload: { collaborator_id: number; document_step_id?: number | null; work_type_id?: number | null; quantity: number | null }) =>
        apply((await api.put<ReportResponse>(`${base}/hours`, payload)).data).data,
      addCollaborator: async (collaboratorId: number) =>
        apply((await api.post<ReportResponse>(`${base}/collaborators`, { collaborator_id: collaboratorId })).data).data,
      removeCollaborator: async (collaboratorId: number) =>
        apply((await api.delete<ReportResponse>(`${base}/collaborators/${collaboratorId}`)).data).data,
      copyTeam: async () => apply((await api.post<ReportResponse>(`${base}/copy-team`)).data).data,
      addItem: async (payload: ReportItemPayload) => {
        const response = apply((await api.post<ReportResponse>(`${base}/items`, payload)).data)
        void queryClient.invalidateQueries({ queryKey: ['price-elements'] })
        return response.created_item_id ?? null
      },
      updateItem: async (id: number, payload: ReportItemPayload) =>
        apply((await api.put<ReportResponse>(`${base}/items/${id}`, payload)).data).data,
      deleteItem: async (id: number) => apply((await api.delete<ReportResponse>(`${base}/items/${id}`)).data).data,
      uploadFiles: async (files: File[]) => {
        const body = new FormData()
        files.forEach((file) => body.append('files[]', file))
        return apply((await api.post<ReportResponse>(`${base}/files`, body)).data).data
      },
      updateFile: async (id: number, caption: string | null) =>
        apply((await api.put<ReportResponse>(`${base}/files/${id}`, { caption })).data).data,
      deleteFile: async (id: number) => apply((await api.delete<ReportResponse>(`${base}/files/${id}`)).data).data,
    }
  }, [reportId, queryClient])
}

export type DailyReportActions = ReturnType<typeof useDailyReportActions>

/** Collaborateurs actifs (grille des heures, responsable du rapport). */
export function useCollaborators(activeOnly = true) {
  return useQuery({
    queryKey: ['collaborators', 'options', activeOnly],
    queryFn: async () =>
      (await api.get<Paginated<Collaborator>>('/collaborators', { params: { active: activeOnly ? 1 : undefined, per_page: 500 } })).data.data,
    staleTime: 60_000,
  })
}

/** Types de travail hors étapes (colonnes supplémentaires de la grille). */
export function useWorkTypes() {
  return useQuery({
    queryKey: ['work-types'],
    queryFn: async () => (await api.get<{ data: WorkType[] }>('/work-types')).data.data,
    staleTime: 5 * 60_000,
  })
}
