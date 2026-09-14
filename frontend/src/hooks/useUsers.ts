import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated, User } from '@/types'

export interface UserPayload {
  name: string
  email: string
  password?: string
  roles: string[]
}

/** Liste paginée des utilisateurs (avec recherche optionnelle). */
export function useUsers(search: string) {
  return useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const response = await api.get<Paginated<User>>('/users', {
        params: search ? { search } : {},
      })
      return response.data
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UserPayload) => {
      const response = await api.post<{ data: User }>('/users', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UserPayload }) => {
      const response = await api.put<{ data: User }>(`/users/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
