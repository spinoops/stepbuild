import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StockItem, StockMovement, StockProduct } from '@/types'

const ITEMS_KEY = ['stock', 'items'] as const

export type MovementType = 'entree' | 'sortie' | 'inventaire'

/** Tous les produits suivis : la page cherche, filtre et trie en mémoire. */
export function useStockItems() {
  return useQuery({
    queryKey: ITEMS_KEY,
    queryFn: async () => (await api.get<{ data: StockItem[] }>('/stock/items')).data.data,
    staleTime: 30_000,
  })
}

/** Produits du catalogue pas encore suivis (recherche serveur, dès 2 lettres). */
export function useStockProducts(term: string) {
  const search = term.trim()
  return useQuery({
    queryKey: ['stock', 'products', search],
    queryFn: async () => (await api.get<{ data: StockProduct[] }>('/stock/products', { params: { search, limit: 30 } })).data.data,
    enabled: search.length >= 2,
    staleTime: 10_000,
  })
}

/** Historique d'un produit (50 derniers mouvements). */
export function useStockHistory(itemId: number | null) {
  return useQuery({
    queryKey: ['stock', 'history', itemId],
    queryFn: async () => (await api.get<{ data: StockMovement[] }>(`/stock/items/${itemId}/movements`)).data.data,
    enabled: itemId !== null,
  })
}

function replaceItem(items: StockItem[] | undefined, item: StockItem): StockItem[] {
  if (!items) {
    return [item]
  }
  return items.some((row) => row.id === item.id) ? items.map((row) => (row.id === item.id ? item : row)) : [...items, item]
}

export function useStockMutations() {
  const queryClient = useQueryClient()
  const setItem = (item: StockItem) => queryClient.setQueryData<StockItem[]>(ITEMS_KEY, (items) => replaceItem(items, item))

  const add = useMutation({
    mutationFn: async (payload: { price_element_id: number; quantity?: number; min_quantity?: number | null; location?: string | null }) =>
      (await api.post<{ data: StockItem }>('/stock/items', payload)).data.data,
    onSuccess: (item) => {
      setItem(item)
      void queryClient.invalidateQueries({ queryKey: ['stock', 'products'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; min_quantity?: number | null; location?: string | null; note?: string | null }) =>
      (await api.put<{ data: StockItem }>(`/stock/items/${id}`, payload)).data.data,
    onSuccess: setItem,
  })

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/stock/items/${id}`)
      return id
    },
    onSuccess: (id) => {
      queryClient.setQueryData<StockItem[]>(ITEMS_KEY, (items) => items?.filter((row) => row.id !== id) ?? [])
      void queryClient.invalidateQueries({ queryKey: ['stock', 'products'] })
    },
  })

  const move = useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; type: MovementType; quantity: number; note?: string | null }) =>
      (await api.post<{ item: StockItem; movement: StockMovement }>(`/stock/items/${id}/movements`, payload)).data,
    onSuccess: ({ item }) => {
      setItem(item)
      void queryClient.invalidateQueries({ queryKey: ['stock', 'history', item.id] })
    },
  })

  return { add, update, remove, move }
}
