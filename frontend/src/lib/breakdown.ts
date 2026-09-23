import { computedQuantity, costFamily, round2 } from '@/lib/costFamilies'
import { toNumber } from '@/lib/crud'

/** Ligne de sous-détail telle que saisie (texte), partagée par le devis et les sous-détails types. */
export interface LineDraft {
  key: number
  id?: number
  family: number
  price_element_id: number | null
  label: string
  unit: string
  quantity: string
  per_dimension: boolean
  pack_size: string
  unit_cost: string
  markup_percent: string
  note: string
}

/** Ligne telle que renvoyée par l'API (sous-détail d'une position ou d'un modèle). */
export interface LineData {
  id?: number
  family: number
  price_element_id: number | null
  label: string
  unit: string | null
  quantity: number
  per_dimension: boolean
  pack_size: number | null
  unit_cost: number
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
    label: line.label,
    unit: line.unit ?? '',
    quantity: numberText(line.quantity),
    per_dimension: line.per_dimension,
    pack_size: numberText(line.pack_size),
    unit_cost: numberText(line.unit_cost),
    markup_percent: numberText(line.markup_percent),
    note: line.note ?? '',
  }
}

export function newLine(family: number, values: Partial<LineDraft> = {}): LineDraft {
  return {
    key: nextKey++,
    family,
    price_element_id: null,
    label: '',
    unit: '',
    quantity: '1',
    per_dimension: false,
    pack_size: '',
    unit_cost: '',
    markup_percent: String(costFamily(family).defaultMarkup),
    note: '',
    ...values,
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
  const sale = round2(cost * (1 + (toNumber(line.markup_percent) ?? 0) / 100))
  return { counted, cost, sale }
}

export type EvaluatedLine = { line: LineDraft } & ReturnType<typeof evaluateLine>

export function evaluateLines(lines: LineDraft[], dimension: number | null): EvaluatedLine[] {
  return lines.map((line) => ({ line, ...evaluateLine(line, dimension) }))
}
