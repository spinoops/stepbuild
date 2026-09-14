import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AppSettings } from '@/types'

/** Réglages d'identité de l'app (lecture publique). */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get<AppSettings>('/settings')
      return response.data
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AppSettings) => {
      const response = await api.put<AppSettings>('/settings', payload)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data)
    },
  })
}
