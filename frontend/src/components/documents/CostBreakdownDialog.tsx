import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import BreakdownLinesTable from '@/components/documents/BreakdownLinesTable'
import TemplatePicker from '@/components/documents/TemplatePicker'
import { toNumber } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import { round2 } from '@/lib/costFamilies'
import { evaluateLines, hasLabel, insertLine, lineFromData, numberText, toLinePayload } from '@/lib/breakdown'
import type { LineDraft } from '@/lib/breakdown'
import type { DocumentActions } from '@/hooks/useDocuments'
import { fetchTemplateForUse, useSaveBreakdownTemplate } from '@/hooks/useBreakdownTemplates'
import type { DocumentPosition } from '@/types'
import { Icon } from '@/components/icons'

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

function fromPosition(position: DocumentPosition): BreakdownState {
  return {
    dimension: numberText(position.dimension),
    dimension_unit: position.dimension_unit ?? '',
    price_per_dimension: position.price_per_dimension,
    internal_remark: position.internal_remark ?? '',
    lines: (position.costs ?? []).map((cost) => lineFromData(cost)),
  }
}

/** Charge utile envoyée au serveur, et sa forme comparable (sans les ids) pour ne rien renvoyer d'inchangé. */
function serialize(state: BreakdownState) {
  const sent = state.lines.filter(hasLabel)
  const payload = {
    dimension: toNumber(state.dimension),
    dimension_unit: state.dimension_unit.trim() || null,
    price_per_dimension: state.price_per_dimension,
    internal_remark: state.internal_remark.trim() || null,
    lines: sent.map(toLinePayload),
  }
  return { sent, payload, serialized: JSON.stringify({ ...payload, lines: payload.lines.map((line) => ({ ...line, id: undefined })) }) }
}

/**
 * Sous-détail de prix d'une position : le prix de vente se construit à partir des coûts par famille
 * (MO, MAT, MACH, MAT EX, OUT, ST) rapportés à la dimension de l'ouvrage, puis majorés. Un sous-détail
 * type (bibliothèque du métreur) se charge d'un mot ; enregistré automatiquement ; « Reporter » copie le
 * prix calculé dans la ligne du devis.
 */
export default function CostBreakdownDialog({ position, actions, onSaving, onPriceApplied, onClose }: CostBreakdownDialogProps) {
  const [state, setState] = useState<BreakdownState>(() => fromPosition(position))
  const latest = useRef(state)
  const saved = useRef(serialize(fromPosition(position)).serialized)
  const timer = useRef<number | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const saveTemplate = useSaveBreakdownTemplate()

  const dimension = toNumber(state.dimension)
  const divisor = state.price_per_dimension && dimension !== null && dimension > 0 ? dimension : 1
  const evaluated = useMemo(() => evaluateLines(state.lines, dimension), [state.lines, dimension])
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

  const updateLine = (key: number, patch: Partial<LineDraft>) =>
    update((current) => ({ ...current, lines: current.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)) }))
  const addLine = (line: LineDraft) => update((current) => ({ ...current, lines: insertLine(current.lines, line) }))
  const removeLine = (key: number) => update((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) }), 300)

  /** Charge un sous-détail type : ses lignes remplacent les lignes actuelles, la DIM saisie est conservée. */
  async function loadTemplate(id: number) {
    if (hasLines && !window.confirm('Remplacer les lignes actuelles par celles du modèle ?')) {
      return
    }
    try {
      const template = await fetchTemplateForUse(id)
      update((current) => ({
        ...current,
        dimension: current.dimension.trim() || numberText(template.dimension),
        dimension_unit: template.dimension_unit ?? current.dimension_unit,
        price_per_dimension: template.price_per_dimension,
        internal_remark: current.internal_remark.trim() || [`Modèle : ${template.name}`, template.note].filter(Boolean).join(' — '),
        lines: (template.lines ?? []).map((line) => lineFromData(line, false)),
      }), 0)
      window.setTimeout(() => window.document.querySelector<HTMLInputElement>('[data-dim]')?.select(), 40)
    } catch {
      toast("Le modèle n'a pas pu être chargé.", 'error')
    }
  }

  /** Enregistre le sous-détail courant comme modèle réutilisable. */
  function saveAsTemplate() {
    const name = window.prompt('Nom du sous-détail type (ouvrage) :', position.description.split('\n')[0].slice(0, 80))
    if (!name?.trim()) {
      return
    }
    const current = latest.current
    saveTemplate.mutate(
      {
        id: null,
        payload: {
          name: name.trim(),
          dimension: toNumber(current.dimension),
          dimension_unit: current.dimension_unit.trim() || null,
          price_per_dimension: current.price_per_dimension,
          lines: current.lines.filter(hasLabel).map((line) => ({ ...toLinePayload(line), id: undefined })),
        },
      },
      {
        onSuccess: () => toast('Sous-détail type enregistré.', 'success'),
        onError: () => toast("Le modèle n'a pas pu être enregistré.", 'error'),
      },
    )
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
              data-dim
              value={state.dimension}
              onChange={(e) => update({ dimension: e.target.value })}
              inputMode="decimal"
              placeholder="9"
              className="h-7 w-20 rounded-md border border-gray-300 px-2 text-right text-[13px] outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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
            <input type="checkbox" checked={state.price_per_dimension} onChange={(e) => update({ price_per_dimension: e.target.checked }, 0)} className="h-4 w-4 accent-primary-600" />
            Prix de la position par {unitLabel} (total ÷ DIM)
          </label>
          <span className="ml-auto">
            <TemplatePicker onPick={(template) => void loadTemplate(template.id)} />
          </span>
        </div>

        <div className="mt-3">
          <BreakdownLinesTable evaluated={evaluated} onUpdateLine={updateLine} onAddLine={addLine} onRemoveLine={removeLine} />
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
          <span className="flex items-center gap-3 text-[12px] text-gray-400">
            {status === 'saving' ? 'Enregistrement…' : status === 'error' ? 'Non enregistré' : 'Enregistré automatiquement'}
            {hasLines && (
              <button type="button" onClick={saveAsTemplate} disabled={saveTemplate.isPending} className="text-gray-500 hover:text-primary-700 hover:underline">
                Enregistrer comme sous-détail type
              </button>
            )}
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
