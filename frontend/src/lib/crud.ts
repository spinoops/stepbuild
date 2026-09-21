import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/types'

/** État d'une grille côté serveur : filtres par colonne, tri, page. */
export interface GridQuery {
  filters: Record<string, string>
  sort: { key: string; dir: 'asc' | 'desc' } | null
  page: number
}

export const EMPTY_QUERY: GridQuery = { filters: {}, sort: null, page: 1 }

type Extra = Record<string, string | number | boolean | null | undefined>

/** Traduit l'état de grille en paramètres d'API (cf. HandlesGridQuery côté Laravel). */
export function gridParams(query: GridQuery, extra: Extra = {}, perPage = 100): Record<string, string | number> {
  const params: Record<string, string | number> = { page: query.page, per_page: perPage }
  for (const [column, value] of Object.entries(query.filters)) {
    if (value.trim()) {
      params[`filter[${column}]`] = value.trim()
    }
  }
  if (query.sort) {
    params.sort = query.sort.key
    params.dir = query.sort.dir
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== null && value !== undefined && value !== '' && value !== false) {
      params[key] = value === true ? 1 : value
    }
  }
  return params
}

/** Liste paginée d'une ressource (garde la page précédente affichée pendant le chargement). */
export function useResourceList<T>(resource: string, query: GridQuery, extra: Extra = {}, enabled = true) {
  const params = gridParams(query, extra)
  return useQuery({
    queryKey: [resource, 'list', params],
    queryFn: async () => (await api.get<Paginated<T>>(`/${resource}`, { params })).data,
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Un élément par identifiant (utile quand il n'est pas dans la page de liste courante). */
export function useResourceItem<T>(resource: string, id: number | null, enabled = true) {
  return useQuery({
    queryKey: [resource, 'item', id],
    queryFn: async () => (await api.get<{ data: T }>(`/${resource}/${id}`)).data.data,
    enabled: enabled && id !== null,
  })
}

/** Création (id nul) ou mise à jour. */
export function useSaveResource<T, P>(resource: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number | null; payload: P }) => {
      const response = id
        ? await api.put<{ data: T }>(`/${resource}/${id}`, payload)
        : await api.post<{ data: T }>(`/${resource}`, payload)
      return response.data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [resource] })
      void queryClient.invalidateQueries({ queryKey: ['search-index'] })
    },
  })
}

export function useDeleteResource(resource: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/${resource}/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [resource] })
      void queryClient.invalidateQueries({ queryKey: ['search-index'] })
    },
  })
}

/** Chaîne vide → null, pour les champs facultatifs. */
export function nullable(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

/** Saisie de prix (« 1'250.50 », « 12,5 ») → nombre ou null. */
export function toNumber(value: string | undefined): number | null {
  const cleaned = (value ?? '').replace(/['’\s]/g, '').replace(',', '.')
  if (cleaned === '') {
    return null
  }
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

export const PRICE_PATTERN = /^\s*$|^\s*\d[\d'’\s]*([.,]\d{1,4})?\s*$/
