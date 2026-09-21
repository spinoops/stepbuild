/** Familles d'éléments de coûts (cf. PriceElement::FAMILIES côté API). */
export const PRICE_FAMILIES = [
  { id: 1, label: '1 - Salaire' },
  { id: 2, label: '2 - Matériaux' },
  { id: 3, label: '3 - Machines/Engins' },
  { id: 4, label: '4 - Matériaux exploitation' },
  { id: 5, label: '5 - Outillage' },
  { id: 6, label: '6 - Tiers' },
] as const

export const ADDRESS_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'sous_traitant', label: 'Sous-traitant' },
  { value: 'contact', label: 'Contact' },
] as const

export function addressTypeLabel(type: string): string {
  return ADDRESS_TYPES.find((item) => item.value === type)?.label ?? type
}
