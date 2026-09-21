import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Address, Paginated, Project, ProjectAddress, ProjectPhoto, ProjectStatus } from '@/types'

/** Compteurs de projets actifs par statut. */
export function useProjectStats() {
  return useQuery({
    queryKey: ['projects', 'stats'],
    queryFn: async () =>
      (await api.get<{ data: Record<ProjectStatus, number>; total: number }>('/projects/stats')).data,
  })
}

/** Projets actifs pour la barre de contexte (liste légère, triée du plus récent au plus ancien). */
export function useProjectOptions() {
  return useQuery({
    queryKey: ['projects', 'options'],
    queryFn: async () =>
      (await api.get<Paginated<Project>>('/projects', { params: { active: 1, per_page: 500 } })).data.data,
    staleTime: 60_000,
  })
}

/** Adresses actives du carnet, pour choisir un client ou une adresse de projet. */
export function useAddressOptions(enabled = true) {
  return useQuery({
    queryKey: ['addresses', 'options'],
    queryFn: async () =>
      (await api.get<Paginated<Address>>('/addresses', { params: { active: 1, per_page: 500 } })).data.data,
    staleTime: 60_000,
    enabled,
  })
}

/** Prochain numéro proposé pour un NPA (2853 → 2853-056). */
export async function fetchNextProjectNumber(zip: string): Promise<string> {
  return (await api.get<{ number: string }>('/projects/next-number', { params: { zip } })).data.number
}

function useInvalidateProjects() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['projects'] })
}

export type ProjectAddressPayload = Omit<ProjectAddress, 'id' | 'project_id' | 'position'>

export function useSaveProjectAddress(projectId: number) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number | null; payload: ProjectAddressPayload }) => {
      const url = `/projects/${projectId}/addresses`
      const response = id
        ? await api.put<{ data: ProjectAddress }>(`${url}/${id}`, payload)
        : await api.post<{ data: ProjectAddress }>(url, payload)
      return response.data.data
    },
    onSuccess: invalidate,
  })
}

export function useDeleteProjectAddress(projectId: number) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/projects/${projectId}/addresses/${id}`)
    },
    onSuccess: invalidate,
  })
}

export function useUploadProjectPhotos(projectId: number) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: async (files: File[]) => {
      const body = new FormData()
      files.forEach((file) => body.append('photos[]', file))
      return (await api.post<{ data: ProjectPhoto[] }>(`/projects/${projectId}/photos`, body)).data.data
    },
    onSuccess: invalidate,
  })
}

export function useUpdateProjectPhoto(projectId: number) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; caption?: string | null; cover?: boolean }) =>
      (await api.put<{ data: ProjectPhoto }>(`/projects/${projectId}/photos/${id}`, payload)).data.data,
    onSuccess: invalidate,
  })
}

export function useDeleteProjectPhoto(projectId: number) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/projects/${projectId}/photos/${id}`)
    },
    onSuccess: invalidate,
  })
}
