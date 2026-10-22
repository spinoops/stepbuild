import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
