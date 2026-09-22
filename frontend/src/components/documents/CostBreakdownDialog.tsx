import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Modal from '@/components/ui/Modal'
import { toNumber } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import { COST_FAMILIES, computedQuantity, costFamily, round2 } from '@/lib/costFamilies'
import { useDebounced } from '@/hooks/useDebounced'
import type { BreakdownLinePayload, DocumentActions } from '@/hooks/useDocuments'
import type { DocumentPosition, Paginated, PositionCost, PriceElement } from '@/types'
import { Icon } from '@/components/icons'

interface LineDraft {
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

interface BreakdownState {
  dimension: string
  dimension_unit: string
  price_per_dimension: boolean
  internal_remark: string
  lines: LineDraft[]
}

interface CostBreakdownDialogProps {
  position: DocumentPosition
  actions: DocumentActions
  onSaving: (saving: boolean) => void
  /** Le prix calculé vient d'être reporté dans la position (la ligne du devis se resynchronise). */
  onPriceApplied: () => void
  onClose: () => void
}

let nextKey = 1
const text = (value: number | null) => (value === null ? '' : String(value))

function fromCost(cost: PositionCost): LineDraft {
  return {
    key: nextKey++,
    id: cost.id,
    family: cost.family,
    price_element_id: cost.price_element_id,
    label: cost.label,
    unit: cost.unit ?? '',
    quantity: text(cost.quantity),
    per_dimension: cost.per_dimension,
    pack_size: text(cost.pack_size),
    unit_cost: text(cost.unit_cost),
    markup_percent: text(cost.markup_percent),
    note: cost.note ?? '',
  }
}

function fromPosition(position: DocumentPosition): BreakdownState {
  return {
    dimension: text(position.dimension),
    dimension_unit: position.dimension_unit ?? '',
    price_per_dimension: position.price_per_dimension,
    internal_remark: position.internal_remark ?? '',
    lines: (position.costs ?? []).map(fromCost),
  }
}

const hasLabel = (line: LineDraft) => line.label.trim() !== ''

/** Charge utile envoyée au serveur, et sa forme comparable (sans les ids) pour ne rien renvoyer d'inchangé. */
function serialize(state: BreakdownState) {
  const sent = state.lines.filter(hasLabel)
  const payload = {
    dimension: toNumber(state.dimension),
    dimension_unit: state.dimension_unit.trim() || null,
    price_per_dimension: state.price_per_dimension,
    internal_remark: state.internal_remark.trim() || null,
    lines: sent.map(toPayloadLine),
  }
  return { sent, payload, serialized: JSON.stringify({ ...payload, lines: payload.lines.map((line) => ({ ...line, id: undefined })) }) }
}

function toPayloadLine(line: LineDraft): BreakdownLinePayload {
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
function evaluate(line: LineDraft, dimension: number | null) {
  const numbers = {
    quantity: toNumber(line.quantity) ?? 0,
    per_dimension: line.per_dimension,
    pack_size: toNumber(line.pack_size),
  }
  const counted = computedQuantity(numbers, dimension)
  const cost = round2(counted * (toNumber(line.unit_cost) ?? 0))
  const sale = round2(cost * (1 + (toNumber(line.markup_percent) ?? 0) / 100))
  return { counted, cost, sale }
}

const CELL =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] outline-none transition hover:border-gray-200 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100'

/**
 * Sous-détail de prix d'une position : le prix de vente se construit à partir des coûts par famille
 * (MO, MAT, MACH, MAT EX, OUT, ST) rapportés à la dimension de l'ouvrage, puis majorés. Enregistré
 * automatiquement ; « Reporter » copie le prix calculé dans la ligne du devis.
 */
export default function CostBreakdownDialog({ position, actions, onSaving, onPriceApplied, onClose }: CostBreakdownDialogProps) {
  const [state, setState] = useState<BreakdownState>(() => fromPosition(position))
  const latest = useRef(state)
  const saved = useRef(serialize(fromPosition(position)).serialized)
  const timer = useRef<number | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const dimension = toNumber(state.dimension)
  const divisor = state.price_per_dimension && dimension !== null && dimension > 0 ? dimension : 1
  const evaluated = useMemo(() => state.lines.map((line) => ({ line, ...evaluate(line, dimension) })), [state.lines, dimension])
  const totalCost = round2(evaluated.reduce((sum, item) => sum + item.cost, 0))
  const totalSale = round2(evaluated.reduce((sum, item) => sum + item.sale, 0))
  const calculatedPrice = round2(totalSale / divisor)
  const calculatedCost = round2(totalCost / divisor)
  const hasLines = state.lines.some(hasLabel)
  const currentPrice = position.unit_price
  const difference = currentPrice !== null && hasLines ? round2(currentPrice - calculatedPrice) : null

  function update(patch: Partial<BreakdownState> | ((current: BreakdownState) => BreakdownState), delay = 1000) {
    const next = typeof patch === 'function' ? patch(latest.current) : { ...latest.current, ...patch }
    latest.current = next
    setState(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void save(), delay)
  }

  function updateLine(key: number, patch: Partial<LineDraft>) {
    update((current) => ({ ...current, lines: current.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)) }))
  }

  function addLine(family: number, values: Partial<LineDraft>) {
    const key = nextKey++
    const line: LineDraft = {
      key,
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
    // Insérée à la fin de sa famille, les familles restant dans l'ordre MO → ST.
    update((current) => {
      const lines = [...current.lines]
      let index = lines.length
      while (index > 0 && lines[index - 1].family > family) {
        index -= 1
      }
      lines.splice(index, 0, line)
      return { ...current, lines }
    })
    window.setTimeout(() => window.document.querySelector<HTMLInputElement>(`[data-bq="${key}"]`)?.select(), 40)
  }

  function removeLine(key: number) {
    update((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) }), 300)
  }

  // Les enregistrements se suivent dans l'ordre : un clic sur « Reporter » pendant une sauvegarde
  // automatique attend qu'elle finisse au lieu d'être ignoré ou de partir en parallèle.
  const queue = useRef<Promise<void>>(Promise.resolve())
  function save(applyPrice = false): Promise<void> {
    const run = queue.current.then(() => doSave(applyPrice))
    queue.current = run.catch(() => undefined)
    return run
  }

  async function doSave(applyPrice: boolean) {
    window.clearTimeout(timer.current)
    const { sent, payload, serialized } = serialize(latest.current)
    if (!applyPrice && serialized === saved.current) {
      return
    }
    saved.current = serialized
    setStatus('saving')
    onSaving(true)
    try {
      const document = await actions.saveBreakdown(position.id, { ...payload, apply_price: applyPrice })
      // Les lignes créées reçoivent leur id (même ordre que l'envoi) : pas de doublon au prochain enregistrement.
      const fresh = document.steps?.flatMap((step) => step.positions).find((item) => item.id === position.id)
      if (fresh) {
        const ids = fresh.costs.map((cost) => cost.id)
        const keys = sent.map((line) => line.key)
        const withIds = (lines: LineDraft[]) =>
          lines.map((line) => {
            const index = keys.indexOf(line.key)
            return index >= 0 && line.id === undefined && ids[index] !== undefined ? { ...line, id: ids[index] } : line
          })
        latest.current = { ...latest.current, lines: withIds(latest.current.lines) }
        setState((value) => ({ ...value, lines: withIds(value.lines) }))
      }
      setStatus('idle')
      if (applyPrice) {
        onPriceApplied()
        toast('Prix reporté dans la position.', 'success')
      }
    } catch {
      saved.current = ''
      setStatus('error')
      toast("Le sous-détail n'a pas pu être enregistré.", 'error')
    } finally {
      onSaving(false)
    }
  }

  // Fermeture ou changement de position : la saisie en attente part.
  const flush = useRef(save)
  useEffect(() => {
    flush.current = save
  })
  useEffect(() => () => void flush.current(), [])

  function close() {
    void save()
    onClose()
  }

  const title = [position.code, position.description.split('\n')[0]].filter(Boolean).join(' · ')
  const unitLabel = state.dimension_unit.trim() || 'unité'

  return (
    <Modal open onClose={close} size="xl">
      <div
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            close()
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Sous-détail de prix</div>
            <h3 className="truncate text-[15px] font-semibold text-gray-900">{title}</h3>
          </div>
          <button type="button" onClick={close} title="Fermer" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px]">
          <label className="flex items-center gap-2">
            <span className="font-medium text-gray-600" title="Dimension de l'ouvrage : les lignes « × DIM » y sont rapportées">
              DIM
            </span>
            <input
              value={state.dimension}
              onChange={(e) => update({ dimension: e.target.value })}
              inputMode="decimal"
              placeholder="9"
              className="h-7 w-20 rounded-md border border-gray-300 px-2 text-right text-[13px] outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              autoFocus={!hasLines}
            />
            <input
              value={state.dimension_unit}
              onChange={(e) => update({ dimension_unit: e.target.value })}
              placeholder="m²"
              maxLength={20}
              className="h-7 w-16 rounded-md border border-gray-300 px-2 text-[13px] outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              checked={state.price_per_dimension}
              onChange={(e) => update({ price_per_dimension: e.target.checked }, 0)}
              className="h-4 w-4 accent-primary-600"
            />
            Prix de la position par {unitLabel} (total ÷ DIM)
          </label>
          <span className="ml-auto text-[12px] text-gray-400">
            Quantité × coût unitaire, arrondi au conditionnement, puis majoration.
          </span>
        </div>

        <div className="mt-3 max-h-[52vh] overflow-auto rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-bb-ribbon text-[11px] font-semibold text-gray-500">
              <tr>
                <th className="border-b border-gray-200 px-2 py-1.5 text-left">Ressource</th>
                <th className="w-20 border-b border-gray-200 px-1 py-1.5 text-right">Quantité</th>
                <th className="w-14 border-b border-gray-200 px-1 py-1.5 text-left">Un.</th>
                <th className="w-12 border-b border-gray-200 px-1 py-1.5 text-center" title="Quantité par unité de dimension (× DIM)">
                  × DIM
                </th>
                <th className="w-16 border-b border-gray-200 px-1 py-1.5 text-right" title="Conditionnement : arrondi au sac, à la pièce entière…">
                  Cond.
                </th>
                <th className="w-20 border-b border-gray-200 px-1 py-1.5 text-right">Comptée</th>
                <th className="w-24 border-b border-gray-200 px-1 py-1.5 text-right">Coût unit.</th>
                <th className="w-24 border-b border-gray-200 px-2 py-1.5 text-right">Coût</th>
                <th className="w-16 border-b border-gray-200 px-1 py-1.5 text-right">Maj. %</th>
                <th className="w-24 border-b border-gray-200 px-2 py-1.5 text-right">Vente</th>
                <th className="w-8 border-b border-gray-200" />
              </tr>
            </thead>
            {COST_FAMILIES.map((family) => {
              const rows = evaluated.filter((item) => item.line.family === family.id)
              const subtotal = round2(rows.reduce((sum, item) => sum + item.sale, 0))
              return (
                <tbody key={family.id}>
                  <tr className="bg-gray-100">
                    <td colSpan={9} className="px-2 py-1 text-[12px] font-semibold uppercase tracking-wide text-gray-700">
                      {family.code}
                      <span className="ml-2 font-normal normal-case tracking-normal text-gray-400">{family.label}</span>
                    </td>
                    <td className="px-2 py-1 text-right text-[12px] font-semibold tabular-nums text-gray-700">
                      {rows.length > 0 ? fmtAmount(subtotal) : ''}
                    </td>
                    <td />
                  </tr>
                  {rows.map(({ line, counted, cost, sale }) => (
                    <tr key={line.key} className="group border-b border-gray-100">
                      <td className="py-0.5 pl-1">
                        <input
                          value={line.label}
                          onChange={(e) => updateLine(line.key, { label: e.target.value })}
                          placeholder="Libellé"
                          maxLength={255}
                          className={CELL}
                          aria-label="Ressource"
                        />
                      </td>
                      <td className="py-0.5">
                        <input
                          data-bq={line.key}
                          value={line.quantity}
                          onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                          inputMode="decimal"
                          className={`${CELL} text-right`}
                          aria-label="Quantité"
                        />
                      </td>
                      <td className="py-0.5">
                        <input value={line.unit} onChange={(e) => updateLine(line.key, { unit: e.target.value })} maxLength={20} className={CELL} aria-label="Unité" />
                      </td>
                      <td className="py-0.5 text-center">
                        <input
                          type="checkbox"
                          checked={line.per_dimension}
                          onChange={(e) => updateLine(line.key, { per_dimension: e.target.checked })}
                          title="Quantité par unité de dimension : × DIM"
                          className="h-4 w-4 accent-primary-600"
                        />
                      </td>
                      <td className="py-0.5">
                        <input
                          value={line.pack_size}
                          onChange={(e) => updateLine(line.key, { pack_size: e.target.value })}
                          inputMode="decimal"
                          placeholder="—"
                          title="Conditionnement (ex. sac de 25 kg, ou 1 pour arrondir à l'unité)"
                          className={`${CELL} text-right`}
                          aria-label="Conditionnement"
                        />
                      </td>
                      <td className="px-1 py-1 text-right tabular-nums text-gray-500">
                        {fmtAmount(counted, counted % 1 === 0 ? 0 : 2)}
                        {line.pack_size && toNumber(line.pack_size) ? <span className="text-gray-400"> × {line.pack_size}</span> : null}
                      </td>
                      <td className="py-0.5">
                        <input
                          value={line.unit_cost}
                          onChange={(e) => updateLine(line.key, { unit_cost: e.target.value })}
                          inputMode="decimal"
                          className={`${CELL} text-right`}
                          aria-label="Coût unitaire"
                        />
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">{fmtAmount(cost)}</td>
                      <td className="py-0.5">
                        <input
                          value={line.markup_percent}
                          onChange={(e) => updateLine(line.key, { markup_percent: e.target.value })}
                          inputMode="decimal"
                          className={`${CELL} text-right`}
                          aria-label="Majoration"
                        />
                      </td>
                      <td className="px-2 py-1 text-right font-medium tabular-nums">{fmtAmount(sale)}</td>
                      <td className="py-0.5 pr-1">
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          title="Retirer la ligne"
                          className="rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-focus-within:opacity-100 group-hover:opacity-100"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={11} className="border-b border-gray-100 px-1 py-0.5">
                      <ElementPicker
                        family={family.id}
                        onPick={(element) =>
                          addLine(family.id, {
                            price_element_id: element.id,
                            label: element.description,
                            unit: element.unit ?? '',
                            unit_cost: text(element.net_price ?? element.supplier_price ?? element.regie_price),
                          })
                        }
                        onFree={(label) => addLine(family.id, { label })}
                      />
                    </td>
                  </tr>
                </tbody>
              )
            })}
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-start gap-4">
          <label className="min-w-[260px] flex-1 text-[12px] text-gray-500">
            Remarque interne (jamais imprimée)
            <textarea
              value={state.internal_remark}
              onChange={(e) => update({ internal_remark: e.target.value })}
              rows={2}
              maxLength={2000}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-[13px] text-gray-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <dl className="grid w-[340px] grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[13px]">
            <dt className="text-gray-500">Coût total</dt>
            <dd className="text-right tabular-nums">{fmtAmount(totalCost)}</dd>
            <dt className="text-gray-500">Vente calculée (coûts majorés)</dt>
            <dd className="text-right tabular-nums">{fmtAmount(totalSale)}</dd>
            {divisor !== 1 && (
              <>
                <dt className="text-gray-500">Par {unitLabel} : coût / vente</dt>
                <dd className="text-right tabular-nums">
                  {fmtAmount(calculatedCost)} / {fmtAmount(calculatedPrice)}
                </dd>
              </>
            )}
            <dt className="font-medium text-gray-700">Prix calculé de la position</dt>
            <dd className="text-right font-semibold tabular-nums text-primary-800">{hasLines ? fmtAmount(calculatedPrice) : '—'}</dd>
            <dt className="text-gray-500">Prix saisi dans le devis</dt>
            <dd className="text-right tabular-nums">
              {currentPrice !== null ? fmtAmount(currentPrice) : '—'}
              {difference !== null && difference !== 0 && (
                <span className={`ml-2 text-[12px] ${difference < 0 ? 'text-accent-600' : 'text-green-700'}`}>
                  ({difference > 0 ? '+' : ''}
                  {fmtAmount(difference)})
                </span>
              )}
            </dd>
          </dl>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[12px] text-gray-400">
            {status === 'saving' ? 'Enregistrement…' : status === 'error' ? 'Non enregistré' : 'Enregistré automatiquement'}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={close} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
              Fermer
            </button>
            <button
              type="button"
              disabled={!hasLines || (currentPrice !== null && difference === 0)}
              onClick={() => void save(true)}
              className="h-8 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40"
            >
              Reporter {hasLines ? fmtAmount(calculatedPrice) : ''} dans le prix
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

interface ElementPickerProps {
  family: number
  onPick: (element: PriceElement) => void
  onFree: (label: string) => void
}

/**
 * Ajout d'une ligne dans une famille : on tape, les éléments de coûts de la famille apparaissent,
 * Entrée reprend l'élément (libellé, unité, prix net) ou crée une ligne libre avec le texte saisi.
 */
function ElementPicker({ family, onPick, onFree }: ElementPickerProps) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const query = useDebounced(term.trim(), 150)

  const results = useQuery({
    queryKey: ['price-elements', 'picker', family, query],
    queryFn: async () => (await api.get<Paginated<PriceElement>>('/price-elements', { params: { search: query, family, per_page: 8 } })).data.data,
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
  const found = query.length >= 2 ? (results.data ?? []) : []
  const choices = found.length + (term.trim() ? 1 : 0)

  function choose(index: number) {
    const label = term.trim()
    if (index < found.length) {
      onPick(found[index])
    } else if (label) {
      onFree(label)
    } else {
      return
    }
    setTerm('')
    setActive(0)
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 text-gray-400">
        <Icon name="plus" className="h-3.5 w-3.5 shrink-0" />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((value) => Math.max(0, Math.min(choices - 1, value + (event.key === 'ArrowDown' ? 1 : -1))))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              choose(active)
            } else if (event.key === 'Escape' && (open || term)) {
              event.stopPropagation()
              setTerm('')
              setOpen(false)
            }
          }}
          placeholder={`Ajouter ${costFamily(family).label.toLowerCase()} : élément de coûts ou libellé, puis Entrée`}
          className="h-7 w-full bg-transparent text-[12px] text-gray-700 outline-none placeholder:text-gray-300 focus:placeholder:text-gray-400"
        />
      </div>
      {open && term.trim() && (
        <ul className="absolute left-4 z-20 mt-0.5 w-[520px] overflow-hidden rounded-md border border-gray-200 bg-white py-1 text-[13px] shadow-lg">
          {found.map((element, index) => (
            <li key={element.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={`flex w-full items-baseline gap-2 px-3 py-1 text-left ${index === active ? 'bg-primary-50 text-primary-800' : 'hover:bg-gray-50'}`}
              >
                <span className="w-16 shrink-0 text-[12px] text-gray-400">{element.number}</span>
                <span className="min-w-0 flex-1 truncate">{element.description}</span>
                <span className="shrink-0 text-[12px] text-gray-500">
                  {element.unit ?? ''} {element.net_price !== null ? `· ${fmtAmount(element.net_price)}` : ''}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(found.length)}
              className={`flex w-full items-center gap-2 px-3 py-1 text-left ${active === found.length ? 'bg-primary-50 text-primary-800' : 'hover:bg-gray-50'}`}
            >
              <Icon name="edit" className="h-3.5 w-3.5 text-gray-400" />
              Ligne libre « {term.trim()} »
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
