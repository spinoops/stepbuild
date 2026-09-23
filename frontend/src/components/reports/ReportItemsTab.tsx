import { useRef, useState } from 'react'
import ElementPicker from '@/components/shared/ElementPicker'
import { Icon } from '@/components/icons'
import type { DailyReportActions, ReportItemPayload } from '@/hooks/useDailyReports'
import { costFamily } from '@/lib/costFamilies'
import { toNumber } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import type { DailyReport, DailyReportItem, ReportStep } from '@/types'

interface ReportItemsTabProps {
  report: DailyReport
  /** Famille d'éléments de coûts : 2 matériaux … 6 tiers. */
  family: number
  actions: DailyReportActions
  readOnly: boolean
  showPrices: boolean
  onSaving: (saving: boolean) => void
}

const CELL =
  'h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[13px] outline-none transition hover:border-gray-200 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 disabled:hover:border-transparent'

/**
 * Ressources d'une famille (matériaux, machines…) consommées dans le rapport, rattachées à une étape du devis.
 * Ajout depuis les éléments de coûts ou en ligne libre ; chaque ligne s'enregistre à la sortie.
 */
export default function ReportItemsTab({ report, family, actions, readOnly, showPrices, onSaving }: ReportItemsTabProps) {
  const items = (report.items ?? []).filter((item) => item.family === family)
  const steps = report.steps ?? []
  const total = items.reduce((sum, item) => sum + (item.amount ?? 0), 0)
  const label = costFamily(family).label.toLowerCase()

  async function add(payload: ReportItemPayload) {
    onSaving(true)
    try {
      const id = await actions.addItem({ family, document_step_id: steps.length === 1 ? steps[0].id : null, ...payload })
      window.setTimeout(() => document.querySelector<HTMLInputElement>(`[data-iq="${id}"]`)?.select(), 60)
    } catch {
      toast("La ligne n'a pas pu être ajoutée.", 'error')
    } finally {
      onSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10 bg-bb-ribbon text-[11px] font-semibold text-gray-500">
          <tr>
            <th className="w-56 border-b border-gray-200 px-2 py-1.5 text-left">Étape du devis</th>
            <th className="border-b border-gray-200 px-2 py-1.5 text-left">Désignation</th>
            <th className="w-20 border-b border-gray-200 px-1 py-1.5 text-right">Quantité</th>
            <th className="w-14 border-b border-gray-200 px-1 py-1.5 text-left">Un.</th>
            {showPrices && <th className="w-24 border-b border-gray-200 px-1 py-1.5 text-right">Coût unit.</th>}
            {showPrices && <th className="w-24 border-b border-gray-200 px-2 py-1.5 text-right">Montant</th>}
            <th className="w-48 border-b border-gray-200 px-2 py-1.5 text-left">Remarque</th>
            <th className="w-8 border-b border-gray-200" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ItemRow key={item.id} item={item} steps={steps} actions={actions} readOnly={readOnly} showPrices={showPrices} onSaving={onSaving} />
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="px-2 py-3 text-[13px] text-gray-400">
                Aucune ligne de {label} dans ce rapport.
              </td>
            </tr>
          )}
          {!readOnly && (
            <tr>
              <td colSpan={8} className="border-b border-gray-100 px-2 py-1">
                <ElementPicker
                  family={family}
                  showPrices={showPrices}
                  pickerKey={`items-${family}`}
                  placeholder={`Ajouter ${label} : élément de coûts ou désignation libre, puis Entrée`}
                  onPick={(element) => void add({ price_element_id: element.id, quantity: 1 })}
                  onFree={(text) => void add({ label: text, quantity: 1 })}
                />
              </td>
            </tr>
          )}
        </tbody>
        {showPrices && items.length > 0 && (
          <tfoot>
            <tr className="text-[12px] font-semibold text-gray-700">
              <td colSpan={5} className="border-t border-gray-200 px-2 py-1.5 text-right">
                Total {label}
              </td>
              <td className="border-t border-gray-200 px-2 py-1.5 text-right tabular-nums">{fmtAmount(total)}</td>
              <td colSpan={2} className="border-t border-gray-200" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

interface ItemRowProps {
  item: DailyReportItem
  steps: ReportStep[]
  actions: DailyReportActions
  readOnly: boolean
  showPrices: boolean
  onSaving: (saving: boolean) => void
}

interface Draft {
  document_step_id: string
  label: string
  quantity: string
  unit: string
  unit_cost: string
  note: string
}

const text = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value))

function toDraft(item: DailyReportItem): Draft {
  return {
    document_step_id: item.document_step_id ? String(item.document_step_id) : '',
    label: item.label,
    quantity: text(item.quantity),
    unit: item.unit ?? '',
    unit_cost: text(item.unit_cost),
    note: item.note ?? '',
  }
}

/** Ligne éditable en place : brouillon local, enregistré à la sortie de la ligne. */
function ItemRow({ item, steps, actions, readOnly, showPrices, onSaving }: ItemRowProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(item))
  const saved = useRef(JSON.stringify(draft))
  const removed = useRef(false)

  async function save() {
    const serialized = JSON.stringify(draft)
    if (removed.current || serialized === saved.current || !draft.label.trim()) {
      return
    }
    saved.current = serialized
    onSaving(true)
    try {
      await actions.updateItem(item.id, {
        document_step_id: draft.document_step_id ? Number(draft.document_step_id) : null,
        label: draft.label.trim(),
        quantity: toNumber(draft.quantity) ?? 0,
        unit: draft.unit.trim() || null,
        ...(showPrices ? { unit_cost: toNumber(draft.unit_cost) } : {}),
        note: draft.note.trim() || null,
      })
    } catch {
      saved.current = ''
      toast("La ligne n'a pas pu être enregistrée.", 'error')
    } finally {
      onSaving(false)
    }
  }

  const change = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }))
  const amount = showPrices ? (toNumber(draft.quantity) ?? 0) * (toNumber(draft.unit_cost) ?? 0) : null

  return (
    <tr
      className="group border-b border-gray-100"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          void save()
        }
      }}
    >
      <td className="py-0.5 pl-1">
        <select value={draft.document_step_id} onChange={(e) => change({ document_step_id: e.target.value })} onBlur={() => void save()} disabled={readOnly} className={`${CELL} px-1`} aria-label="Étape">
          <option value="">— étape —</option>
          {steps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.code} {step.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-0.5">
        <input value={draft.label} onChange={(e) => change({ label: e.target.value })} disabled={readOnly} className={CELL} aria-label="Désignation" />
      </td>
      <td className="py-0.5">
        <input
          data-iq={item.id}
          value={draft.quantity}
          onChange={(e) => change({ quantity: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              document.querySelector<HTMLInputElement>(`[data-picker="items-${item.family}"]`)?.focus()
            }
          }}
          disabled={readOnly}
          inputMode="decimal"
          className={`${CELL} text-right`}
          aria-label="Quantité"
        />
      </td>
      <td className="py-0.5">
        <input value={draft.unit} onChange={(e) => change({ unit: e.target.value })} disabled={readOnly} maxLength={20} className={CELL} aria-label="Unité" />
      </td>
      {showPrices && (
        <td className="py-0.5">
          <input value={draft.unit_cost} onChange={(e) => change({ unit_cost: e.target.value })} disabled={readOnly} inputMode="decimal" className={`${CELL} text-right`} aria-label="Coût unitaire" />
        </td>
      )}
      {showPrices && <td className="px-2 py-0.5 text-right tabular-nums">{amount ? fmtAmount(amount) : ''}</td>}
      <td className="py-0.5">
        <input value={draft.note} onChange={(e) => change({ note: e.target.value })} disabled={readOnly} maxLength={255} className={CELL} aria-label="Remarque" />
      </td>
      <td className="py-0.5 pr-1">
        {!readOnly && (
          <button
            type="button"
            title="Supprimer la ligne"
            onClick={() => {
              removed.current = true
              void actions.deleteItem(item.id).catch(() => {
                removed.current = false
                toast('Suppression impossible.', 'error')
              })
            }}
            className="rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-focus-within:opacity-100 group-hover:opacity-100"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  )
}
