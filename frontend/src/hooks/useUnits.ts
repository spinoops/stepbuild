import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Unit } from '@/types'

/** Unités de mesure actives (devis, catalogue) ; all = inactives comprises (réglages). */
export function useUnits(all = false) {
  return useQuery({
    queryKey: ['units', all],
    queryFn: async () => (await api.get<{ data: Unit[] }>('/units', { params: all ? { all: 1 } : undefined })).data.data,
    staleTime: 5 * 60_000,
  })
}

export interface UnitPayload {
  code?: string
  label?: string | null
  is_active?: boolean
}

/** Gestion des unités (réglages) : ajout, modification, suppression, ordre. */
export function useUnitActions() {
  const queryClient = useQueryClient()
  return useMemo(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['units'] })
    return {
      create: async (payload: UnitPayload) => {
        const unit = (await api.post<{ data: Unit }>('/units', payload)).data.data
        await invalidate()
        return unit
      },
      update: async (id: number, payload: UnitPayload) => {
        const unit = (await api.put<{ data: Unit }>(`/units/${id}`, payload)).data.data
        await invalidate()
        return unit
      },
      remove: async (id: number) => {
        await api.delete(`/units/${id}`)
        await invalidate()
      },
      reorder: async (ids: number[]) => {
        await api.post('/units/reorder', { ids })
        await invalidate()
      },
    }
  }, [queryClient])
}
