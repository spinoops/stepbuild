/**
 * Familles du sous-détail de prix d'une position de devis : les mêmes que les éléments de coûts,
 * avec les abréviations des métreurs (MO, MAT, MACH, MAT EX, OUT, ST) et la majoration proposée
 * par défaut sur une nouvelle ligne (30 % sur la main-d'œuvre, cf. plan de création).
 */
export interface CostFamily {
  id: number
  code: string
  label: string
  defaultMarkup: number
}

export const COST_FAMILIES: CostFamily[] = [
  { id: 1, code: 'MO', label: "Main-d'œuvre", defaultMarkup: 30 },
  { id: 2, code: 'MAT', label: 'Matériaux', defaultMarkup: 0 },
  { id: 3, code: 'MACH', label: 'Machines', defaultMarkup: 0 },
  { id: 4, code: 'MAT EX', label: "Matériaux d'exploitation", defaultMarkup: 0 },
  { id: 5, code: 'OUT', label: 'Outillage', defaultMarkup: 0 },
  { id: 6, code: 'ST', label: 'Sous-traitants', defaultMarkup: 0 },
]

export function costFamily(id: number): CostFamily {
  return COST_FAMILIES.find((family) => family.id === id) ?? COST_FAMILIES[1]
}

/** Quantité comptée : × dimension si la ligne est « par unité de dimension », arrondie au conditionnement supérieur. */
export function computedQuantity(
  line: { quantity: number; per_dimension: boolean; pack_size: number | null },
  dimension: number | null,
): number {
  const quantity = line.quantity * (line.per_dimension ? (dimension ?? 1) : 1)
  if (line.pack_size !== null && line.pack_size > 0) {
    return Math.ceil(Math.round((quantity / line.pack_size) * 1e6) / 1e6)
  }
  return quantity
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}
