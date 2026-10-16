import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import BreakdownLinesTable from '@/components/documents/BreakdownLinesTable'
import TemplatePicker from '@/components/documents/TemplatePicker'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import { round2 } from '@/lib/costFamilies'
import { evaluateLines, hasLabel, insertLine, lineFromData, toLinePayload } from '@/lib/breakdown'
import type { LineDraft } from '@/lib/breakdown'
import type { DocumentActions } from '@/hooks/useDocuments'
import { fetchTemplateForUse, useSaveBreakdownTemplate } from '@/hooks/useBreakdownTemplates'
import type { DocumentPosition } from '@/types'
import { Icon } from '@/components/icons'

interface BreakdownState {
  internal_remark: string
  lines: LineDraft[]
}

interface CostBreakdownDialogProps {
  position: DocumentPosition
  actions: DocumentActions
  onSaving: (saving: boolean) => void
  /** Le sous-détail vient d'être enregistré : le prix de la ligne du devis en découle (la ligne se resynchronise). */
  onPriceApplied: () => void
  onClose: () => void
}

function fromPosition(position: DocumentPosition): BreakdownState {
  return {
    internal_remark: position.internal_remark ?? '',
    lines: (position.costs ?? []).map((cost) => lineFromData(cost)),
  }
}

/** Charge utile envoyée au serveur, et sa forme comparable (sans les ids) pour ne rien renvoyer d'inchangé. */
function serialize(state: BreakdownState) {
  const sent = state.lines.filter(hasLabel)
  const payload = {
    internal_remark: state.internal_remark.trim() || null,
    lines: sent.map(toLinePayload),
  }
  return { sent, payload, serialized: JSON.stringify({ ...payload, lines: payload.lines.map((line) => ({ ...line, id: undefined })) }) }
}

/** Quantité affichée : 10, 2.5, 37.8. */
const qty = (value: number) => String(Math.round(value * 1000) / 1000)

/**
 * Sous-détail de prix d'une position : **le calcul complet de la ligne**. Les coûts par famille
 * (MO, MAT, MACH, MAT EX, OUT, ST), majorés, donnent le total de la ligne ; divisé par sa quantité,
 * il devient le prix unitaire (1 000.- pour 10 m² → 100.-/m²), qui suit ensuite tout changement de
 * quantité. Un sous-détail type (bibliothèque du métreur) se charge d'un mot ; enregistré automatiquement.
 */
export default function CostBreakdownDialog({ position, actions, onSaving, onPriceApplied, onClose }: CostBreakdownDialogProps) {
  const [state, setState] = useState<BreakdownState>(() => fromPosition(position))
  const latest = useRef(state)
  const saved = useRef(serialize(fromPosition(position)).serialized)
  const timer = useRef<number | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const saveTemplate = useSaveBreakdownTemplate()

  // Quantité de référence = quantité de la ligne (une ligne sans quantité compte pour 1).
  const quantity = position.quantity !== null && position.quantity > 0 ? position.quantity : 1
  const evaluated = useMemo(() => evaluateLines(state.lines, quantity), [state.lines, quantity])
  const totalCost = round2(evaluated.reduce((sum, item) => sum + item.cost, 0))
  const totalSale = round2(evaluated.reduce((sum, item) => sum + item.sale, 0))
  const unitPrice = round2(totalSale / quantity)
  const unitCost = round2(totalCost / quantity)
  const hasLines = state.lines.some(hasLabel)
  const unitLabel = position.unit?.trim() || 'unité'

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

  /** Charge un sous-détail type : ses lignes remplacent les lignes actuelles (les lignes « × Qté » suivent la quantité de la ligne). */
  async function loadTemplate(id: number) {
    if (hasLines && !window.confirm('Remplacer les lignes actuelles par celles du modèle ?')) {
      return
    }
    try {
      const template = await fetchTemplateForUse(id)
      update((current) => ({
        ...current,
        internal_remark: current.internal_remark.trim() || [`Modèle : ${template.name}`, template.note].filter(Boolean).join(' — '),
        lines: (template.lines ?? []).map((line) => lineFromData(line, false)),
      }), 0)
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
          dimension: position.quantity,
          dimension_unit: position.unit,
          price_per_dimension: true,
          lines: current.lines.filter(hasLabel).map((line) => ({ ...toLinePayload(line), id: undefined })),
        },
      },
      {
        onSuccess: () => toast('Sous-détail type enregistré.', 'success'),
        onError: () => toast("Le modèle n'a pas pu être enregistré.", 'error'),
      },
    )
  }

  // Les enregistrements se suivent dans l'ordre : une saisie pendant une sauvegarde attend qu'elle finisse.
  const queue = useRef<Promise<void>>(Promise.resolve())
  function save(): Promise<void> {
    const run = queue.current.then(() => doSave())
    queue.current = run.catch(() => undefined)
    return run
  }

  async function doSave() {
    window.clearTimeout(timer.current)
    const { sent, payload, serialized } = serialize(latest.current)
    if (serialized === saved.current) {
      return
    }
    saved.current = serialized
    setStatus('saving')
    onSaving(true)
    try {
      const document = await actions.saveBreakdown(position.id, payload)
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
      onPriceApplied() // le prix unitaire de la ligne vient du sous-détail
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
          <span className="text-gray-600">
            Quantité de la ligne :{' '}
            <span className="font-semibold text-gray-800">
              {position.quantity !== null ? qty(position.quantity) : '—'} {position.unit ?? ''}
            </span>
            {position.quantity === null && <span className="text-gray-400"> (compte pour 1 tant qu'elle n'est pas saisie)</span>}
          </span>
          <span className="text-[12px] text-gray-400">Le sous-détail chiffre la ligne entière ; les lignes « × Qté » suivent sa quantité.</span>
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
          <dl className="grid w-[360px] grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[13px]">
            <dt className="text-gray-500">Coût total de la ligne</dt>
            <dd className="text-right tabular-nums">{fmtAmount(totalCost)}</dd>
            <dt className="text-gray-500">Vente totale (coûts majorés)</dt>
            <dd className="text-right tabular-nums">{fmtAmount(totalSale)}</dd>
            <dt className="text-gray-500">
              ÷ {qty(quantity)} {unitLabel} : coût / vente
            </dt>
            <dd className="text-right tabular-nums">
              {fmtAmount(unitCost)} / {fmtAmount(unitPrice)}
            </dd>
            <dt className="font-medium text-gray-700">Prix unitaire de la position</dt>
            <dd className="text-right font-semibold tabular-nums text-primary-800">{hasLines ? `${fmtAmount(unitPrice)} / ${unitLabel}` : '—'}</dd>
          </dl>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="flex items-center gap-3 text-[12px] text-gray-400">
            {status === 'saving' ? 'Enregistrement…' : status === 'error' ? 'Non enregistré' : 'Enregistré automatiquement, prix reporté dans la ligne'}
            {hasLines && (
              <button type="button" onClick={saveAsTemplate} disabled={saveTemplate.isPending} className="text-gray-500 hover:text-primary-700 hover:underline">
                Enregistrer comme sous-détail type
              </button>
            )}
          </span>
          <button type="button" onClick={close} className="h-8 rounded-md bg-anthracite-800 px-3 text-[13px] font-medium text-white hover:bg-anthracite-700">
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  )
}
