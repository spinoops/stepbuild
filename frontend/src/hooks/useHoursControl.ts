import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AbsenceType, HoursControlCollaborator, HoursControlMatrix } from '@/types'

/** Collaborateurs du mois avec heures saisies, rapports en cours et absences. */
export function useHoursControlSummary(month: string) {
  return useQuery({
    queryKey: ['hours-control', 'summary', month],
    queryFn: async () => (await api.get<{ data: HoursControlCollaborator[]; day_hours: number }>('/hours-control', { params: { month } })).data,
    placeholderData: keepPreviousData,
  })
}

/** Matrice projets × jours d'un collaborateur pour un mois. */
export function useHoursControlMatrix(collaboratorId: number | null, month: string) {
  return useQuery({
    queryKey: ['hours-control', 'matrix', collaboratorId, month],
    queryFn: async () => (await api.get<{ data: HoursControlMatrix }>(`/hours-control/${collaboratorId}`, { params: { month } })).data.data,
    enabled: collaboratorId !== null,
    placeholderData: keepPreviousData,
  })
}

function useInvalidateHoursControl() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['hours-control'] })
    void queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    void queryClient.invalidateQueries({ queryKey: ['regie'] })
  }
}

/** Passe « en contrôle » les rapports encore en cours du mois où le collaborateur a des heures. */
export function useValidateMonth() {
  const invalidate = useInvalidateHoursControl()
  return useMutation({
    mutationFn: async ({ collaboratorId, month }: { collaboratorId: number; month: string }) =>
      (await api.post<{ updated: number }>(`/hours-control/${collaboratorId}/validate`, null, { params: { month } })).data.updated,
    onSuccess: invalidate,
  })
}

export interface AbsencePayload {
  from: string
  to?: string
  type: AbsenceType
  /** Heures par jour ; 0 efface l'absence. Absent = journée complète. */
  hours?: number | null
  note?: string | null
}

export function useSaveAbsence() {
  const invalidate = useInvalidateHoursControl()
  return useMutation({
    mutationFn: async ({ collaboratorId, payload }: { collaboratorId: number; payload: AbsencePayload }) =>
      (await api.post<{ saved: number }>(`/collaborators/${collaboratorId}/absences`, payload)).data.saved,
    onSuccess: invalidate,
  })
}
