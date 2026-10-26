import { computedQuantity, costFamily, round2 } from '@/lib/costFamilies'
import { toNumber } from '@/lib/crud'
import type { ElementRef, PriceElement } from '@/types'

/** Ligne de sous-détail telle que saisie (texte), partagée par le devis et les sous-détails types. */
export interface LineDraft {
  key: number
  id?: number
  family: number
  price_element_id: number | null
  /** Élément de coûts rattaché : unité et prix viennent de lui (le serveur les réapplique à l'enregistrement). */
  element: ElementRef | null
  label: string
  unit: string
  quantity: string
  per_dimension: boolean
  pack_size: string
  /** Prix d'achat unitaire. */
  unit_cost: string
  /** Prix de vente unitaire ; vide = achat × (1 + marge). */
  unit_sale: string
  markup_percent: string
  note: string
}

/** Ligne telle que renvoyée par l'API (sous-détail d'une position ou d'un modèle). */
export interface LineData {
  id?: number
  family: number
  price_element_id: number | null
  element?: ElementRef | null
  label: string
  unit: string | null
  quantity: number
  per_dimension: boolean
  pack_size: number | null
  unit_cost: number
  unit_sale?: number | null
  markup_percent: number
  note: string | null
}

/** Ligne envoyée à l'API (id présent = mise à jour). */
export interface LinePayload {
  id?: number
  family: number
  price_element_id: number | null
  label: string
  unit: string | null
  quantity: number
  per_dimension: boolean
  pack_size: number | null
  unit_cost: number
  unit_sale: number | null
  markup_percent: number
  note: string | null
}

let nextKey = 1

export const numberText = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value))

export function lineFromData(line: LineData, keepId = true): LineDraft {
  return {
    key: nextKey++,
    ...(keepId && line.id !== undefined ? { id: line.id } : {}),
    family: line.family,
    price_element_id: line.price_element_id,
    element: line.element ?? null,
    label: line.label,
    unit: line.unit ?? '',
    quantity: numberText(line.quantity),
    per_dimension: line.per_dimension,
    pack_size: numberText(line.pack_size),
    unit_cost: numberText(line.unit_cost),
    unit_sale: numberText(line.unit_sale ?? null),
    markup_percent: numberText(line.markup_percent),
    note: line.note ?? '',
  }
}

export function newLine(family: number, values: Partial<LineDraft> = {}): LineDraft {
  return {
    key: nextKey++,
    family,
    price_element_id: null,
    element: null,
    label: '',
    unit: '',
    quantity: '1',
    per_dimension: false,
    pack_size: '',
    unit_cost: '',
    unit_sale: '',
    markup_percent: String(costFamily(family).defaultMarkup),
    note: '',
    ...values,
  }
}

/**
 * Valeurs d'une ligne tirées d'un élément de coûts (même règle que le serveur, `BreakdownElements`) :
 * prix d'achat = prix net (sinon fournisseur, sinon vente), prix de vente = prix régie, utilisé tel quel ;
 * la marge affichée en découle. Unité et libellé de l'élément.
 */
export function linkedValues(element: PriceElement | ElementRef): Partial<LineDraft> {
  const net = element.net_price ?? 0
  const supplier = 'supplier_price' in element ? (element.supplier_price ?? 0) : 0
  const regie = element.regie_price ?? 0
  const cost = net > 0 ? net : supplier > 0 ? supplier : regie
  const sale = regie > 0 ? Math.round(regie * 100) / 100 : null
  const markup = cost > 0 && sale !== null ? Math.round((sale / cost - 1) * 1000) / 10 : null
  return {
    price_element_id: element.id,
    element: {
      id: element.id,
      group_code: element.group_code,
      number: element.number,
      description: element.description,
      unit: element.unit,
      net_price: element.net_price,
      regie_price: element.regie_price,
      price_updated_at: element.price_updated_at,
    },
    label: element.description,
    unit: element.unit ?? '',
    unit_cost: numberText(Math.round(cost * 100) / 100),
    unit_sale: numberText(sale),
    ...(markup !== null ? { markup_percent: numberText(markup) } : {}),
  }
}

/** Insère une ligne à la fin de sa famille, les familles restant dans l'ordre MO → ST. */
export function insertLine(lines: LineDraft[], line: LineDraft): LineDraft[] {
  const next = [...lines]
  let index = next.length
  while (index > 0 && next[index - 1].family > line.family) {
    index -= 1
  }
  next.splice(index, 0, line)
  return next
}

export const hasLabel = (line: LineDraft) => line.label.trim() !== ''

export function toLinePayload(line: LineDraft): LinePayload {
  return {
    ...(line.id !== undefined ? { id: line.id } : {}),
    family: line.family,
    price_element_id: line.price_element_id,
    label: line.label.trim(),
    unit: line.unit.trim() || null,
    quantity: toNumber(line.quantity) ?? 0,
    per_dimension: line.per_dimension,
    pack_size: toNumber(line.pack_size),
    unit_cost: toNumber(line.unit_cost) ?? 0,
    unit_sale: toNumber(line.unit_sale),
    markup_percent: toNumber(line.markup_percent) ?? 0,
    note: line.note.trim() || null,
  }
}

/** Coût, vente et quantité comptée d'une ligne, pour l'affichage immédiat (même règle que le serveur). */
export function evaluateLine(line: LineDraft, dimension: number | null) {
  const counted = computedQuantity(
    { quantity: toNumber(line.quantity) ?? 0, per_dimension: line.per_dimension, pack_size: toNumber(line.pack_size) },
    dimension,
  )
  const cost = round2(counted * (toNumber(line.unit_cost) ?? 0))
  const unitSale = toNumber(line.unit_sale)
  // Prix de vente saisi (ou de l'élément de coûts) : utilisé tel quel ; sinon achat majoré.
  const sale = unitSale !== null ? round2(counted * unitSale) : round2(cost * (1 + (toNumber(line.markup_percent) ?? 0) / 100))
  return { counted, cost, sale, unitSale: unitSale ?? round2((toNumber(line.unit_cost) ?? 0) * (1 + (toNumber(line.markup_percent) ?? 0) / 100)) }
}

export type EvaluatedLine = { line: LineDraft } & ReturnType<typeof evaluateLine>

export function evaluateLines(lines: LineDraft[], dimension: number | null): EvaluatedLine[] {
  return lines.map((line) => ({ line, ...evaluateLine(line, dimension) }))
}
