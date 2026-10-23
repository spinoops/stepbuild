import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DocumentStatus, ReportStatus } from '@/types'

export type ControlStatus = 'ok' | 'over' | 'none'

export interface ControlActual {
  hours: number
  cost: number
  regie: number
  client: number
}

export interface ControlPlanned {
  sale: number
  cost: number | null
  hours: number
  budget: number
  budget_basis: 'cost' | 'sale' | null
}

export interface ControlReportLine {
  id: number
  number: string
  date: string
  status: ReportStatus
  is_regie: boolean
  hours: number
  cost: number
  regie: number
  client: number
}

export interface ControlStep {
  id: number | null
  code: string
  label: string
  planned: ControlPlanned | null
  actual: ControlActual
  /** Marge réalisée : prix client par rapport au coût brut, en % (null sans coût). */
  margin_percent: number | null
  /** Coût brut des rapports facturés : leur prix client ne bouge plus. */
  locked_cost: number
  variance: number | null
  percent: number | null
  status: ControlStatus
  reports: ControlReportLine[]
}

export interface CostControlData {
  project: { id: number; number: string; designation1: string }
  document: { id: number; number: string; status: DocumentStatus } | null
  documents: Array<{ id: number; number: string; status: DocumentStatus }>
  reports: { count: number; from: string | null; to: string | null }
  steps: ControlStep[]
  others: ControlStep[]
  totals: {
    planned: { sale: number; cost: number; hours: number; budget: number }
    actual: ControlActual
    margin_percent: number | null
    budget_basis: 'cost' | 'sale' | null
    variance: number
    percent: number | null
    status: ControlStatus
  }
}

export interface CostControlFilters {
  project_id: number | null
  document_id: number | null
  status: ReportStatus | ''
  from: string
  to: string
}

/** Rapport de régie du projet : devis contre rapports journaliers, étape par étape. */
export function useCostControl(filters: CostControlFilters) {
  return useQuery({
    queryKey: ['cost-control', filters],
    queryFn: async () =>
      (
        await api.get<CostControlData>('/cost-control', {
          params: {
            project_id: filters.project_id,
            ...(filters.document_id ? { document_id: filters.document_id } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.from ? { from: filters.from } : {}),
            ...(filters.to ? { to: filters.to } : {}),
          },
        })
      ).data,
    enabled: filters.project_id !== null,
    placeholderData: keepPreviousData,
  })
}

export interface ApplyMarginInput {
  scope: 'step' | 'other' | 'all'
  document_step_id?: number | null
  markup_percent: number
}

/**
 * Applique une marge sur le coût brut (prix client) aux lignes d'une étape, du « hors devis » ou de tout le
 * chantier, dans les rapports non facturés. Le rapport renvoyé remplace celui du cache.
 */
export function useApplyMargin(filters: CostControlFilters) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ApplyMarginInput) =>
      (
        await api.post<{ updated: number; locked: number; report: CostControlData }>('/cost-control/margin', {
          project_id: filters.project_id,
          ...input,
          ...(filters.document_id ? { document_id: filters.document_id } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {}),
        })
      ).data,
    onSuccess: (result) => {
      queryClient.setQueryData(['cost-control', filters], result.report)
      void queryClient.invalidateQueries({ queryKey: ['regie'] })
      void queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
  })
}
