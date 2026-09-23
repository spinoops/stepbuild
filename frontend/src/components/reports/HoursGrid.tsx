import { useMemo, useState } from 'react'
import { BbSelect } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import type { DailyReportActions } from '@/hooks/useDailyReports'
import { toNumber } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import type { Collaborator, DailyReport, ReportStep, WorkType } from '@/types'

interface HoursGridProps {
  report: DailyReport
  actions: DailyReportActions
  collaborators: Collaborator[]
  workTypes: WorkType[]
  readOnly: boolean
  showPrices: boolean
  onSaving: (saving: boolean) => void
}

type ColumnKey = `s${number}` | `w${number}`

interface Column {
  key: ColumnKey
  code: string
  label: string
  step?: ReportStep
  workType?: WorkType
}

const CELL =
  'h-7 w-full rounded border border-transparent bg-transparent px-1 text-right text-[13px] tabular-nums outline-none transition hover:border-gray-200 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 disabled:cursor-default disabled:hover:border-transparent'

/**
 * Grille « Salaire » : une ligne par collaborateur présent, une colonne par étape du devis puis par
 * type de travail (repas, kilomètres…). Chaque cellule s'enregistre à la sortie ou sur Entrée ;
 * Entrée descend d'une ligne, les flèches déplacent le curseur : un rapport se saisit sans souris.
 */
export default function HoursGrid({ report, actions, collaborators, workTypes, readOnly, showPrices, onSaving }: HoursGridProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState('')
  const hours = useMemo(() => report.hours ?? [], [report.hours])
  const steps = useMemo(() => report.steps ?? [], [report.steps])

  const columns = useMemo<Column[]>(
    () => [
      ...steps.map((step) => ({ key: `s${step.id}` as ColumnKey, code: step.code, label: step.label, step })),
      ...workTypes.map((type) => ({ key: `w${type.id}` as ColumnKey, code: type.code, label: type.label, workType: type })),
    ],
    [steps, workTypes],
  )
  const stepKeys = new Set(steps.map((step) => `s${step.id}`))

  // Lignes : collaborateurs présents dans le rapport, dans l'ordre alphabétique.
  const byId = new Map(collaborators.map((item) => [item.id, item]))
  const present = [...new Set(hours.map((line) => line.collaborator_id))]
    .map((id) => byId.get(id) ?? { id, name: `Collaborateur n° ${id}`, hourly_cost: null })
    .sort((a, b) => a.name.localeCompare(b.name))
  const available = collaborators.filter((item) => !present.some((row) => row.id === item.id))

  const cellValue = (collaboratorId: number, column: Column) =>
    hours.find(
      (line) =>
        line.collaborator_id === collaboratorId &&
        (column.step ? line.document_step_id === column.step.id : line.work_type_id === column.workType?.id),
    )?.quantity ?? null

  const rowTotal = (collaboratorId: number) =>
    hours.filter((line) => line.collaborator_id === collaboratorId && line.document_step_id !== null).reduce((sum, line) => sum + line.quantity, 0)
  const rowAmount = (collaboratorId: number) =>
    hours.filter((line) => line.collaborator_id === collaboratorId).reduce((sum, line) => sum + (line.amount ?? 0), 0)
  const columnTotal = (column: Column) => present.reduce((sum, row) => sum + (cellValue(row.id, column) ?? 0), 0)

  async function save(collaboratorId: number, column: Column, raw: string) {
    const key = `${collaboratorId}:${column.key}`
    const quantity = toNumber(raw)
    const current = cellValue(collaboratorId, column)
    setDrafts((value) => {
      const next = { ...value }
      delete next[key]
      return next
    })
    if ((quantity ?? 0) === (current ?? 0)) {
      return
    }
    onSaving(true)
    try {
      await actions.setCell({
        collaborator_id: collaboratorId,
        document_step_id: column.step?.id ?? null,
        work_type_id: column.workType?.id ?? null,
        quantity,
      })
    } catch {
      toast("Les heures n'ont pas pu être enregistrées.", 'error')
    } finally {
      onSaving(false)
    }
  }

  /** Déplacement au clavier entre les cellules (data-cell="collaborateur:colonne"). */
  function move(event: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) {
    const keys: Record<string, [number, number]> = { Enter: [1, 0], ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] }
    const delta = keys[event.key]
    if (!delta) {
      return
    }
    const input = event.currentTarget
    // Flèches gauche/droite : seulement si le curseur est au bord du texte.
    if (event.key === 'ArrowRight' && input.selectionEnd !== input.value.length) return
    if (event.key === 'ArrowLeft' && input.selectionStart !== 0) return
    event.preventDefault()
    const row = present[rowIndex + delta[0]]
    const column = columns[colIndex + delta[1]]
    if (!row || !column) {
      if (event.key === 'Enter') {
        input.blur()
      }
      return
    }
    const target = document.querySelector<HTMLInputElement>(`[data-cell="${row.id}:${column.key}"]`)
    target?.focus()
    target?.select()
  }

  async function add() {
    if (!adding) {
      return
    }
    const id = Number(adding)
    setAdding('')
    try {
      await actions.addCollaborator(id)
      window.setTimeout(() => {
        const first = columns[0]
        const target = first ? document.querySelector<HTMLInputElement>(`[data-cell="${id}:${first.key}"]`) : null
        target?.focus()
      }, 60)
    } catch {
      toast("Le collaborateur n'a pas pu être ajouté.", 'error')
    }
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-gray-500">
        <Icon name="file" className="h-8 w-8 text-gray-300" />
        <p className="font-medium text-gray-700">Ce rapport n'est rattaché à aucun devis avec des étapes.</p>
        <p className="max-w-md text-[13px]">
          Les heures se saisissent sur les étapes du devis du projet. Créez d'abord le devis et ses étapes, puis
          rattachez-le au rapport dans l'en-tête.
        </p>
      </div>
    )
  }

  const head = 'border-b border-gray-200 bg-bb-ribbon px-1 py-1 text-[11px] font-semibold text-gray-500'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="border-collapse text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${head} min-w-[170px] text-left align-bottom`}>Collaborateur</th>
              {showPrices && <th className={`${head} w-14 text-right align-bottom`}>Base</th>}
              {columns.map((column) => (
                <th key={column.key} className={`${head} w-12 align-bottom ${column.workType ? 'bg-gray-100' : ''}`} title={`${column.code} ${column.label}`}>
                  <div className="flex h-[110px] items-end justify-center">
                    <span className="bb-vertical block max-h-[104px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
                      {column.code} {column.label}
                    </span>
                  </div>
                </th>
              ))}
              <th className={`${head} w-16 text-right align-bottom`}>
                Total
                <br />
                heures
              </th>
              {showPrices && <th className={`${head} w-20 text-right align-bottom`}>Montant</th>}
              <th className={head} />
            </tr>
          </thead>
          <tbody>
            {present.map((row, rowIndex) => (
              <tr key={row.id} className="group border-b border-gray-100 hover:bg-gray-50">
                <td className="px-2 py-0.5 font-medium text-gray-800">{row.name}</td>
                {showPrices && <td className="px-1 py-0.5 text-right tabular-nums text-gray-500">{row.hourly_cost != null ? fmtAmount(row.hourly_cost) : ''}</td>}
                {columns.map((column, colIndex) => {
                  const key = `${row.id}:${column.key}`
                  const value = cellValue(row.id, column)
                  const text = drafts[key] ?? (value === null ? '' : String(value))
                  return (
                    <td key={column.key} className={`py-0.5 ${column.workType ? 'bg-gray-50' : ''}`}>
                      <input
                        data-cell={key}
                        value={text}
                        disabled={readOnly}
                        inputMode="decimal"
                        onChange={(e) => setDrafts((current) => ({ ...current, [key]: e.target.value }))}
                        onBlur={(e) => void save(row.id, column, e.target.value)}
                        onKeyDown={(e) => move(e, rowIndex, colIndex)}
                        onFocus={(e) => e.target.select()}
                        className={CELL}
                        aria-label={`${row.name} · ${column.code} ${column.label}`}
                      />
                    </td>
                  )
                })}
                <td className="bg-gray-100 px-2 py-0.5 text-right font-medium tabular-nums">{rowTotal(row.id) ? fmtAmount(rowTotal(row.id)) : ''}</td>
                {showPrices && <td className="px-2 py-0.5 text-right tabular-nums text-gray-600">{rowAmount(row.id) ? fmtAmount(rowAmount(row.id)) : ''}</td>}
                <td className="w-8 py-0.5">
                  {!readOnly && (
                    <button
                      type="button"
                      title="Retirer le collaborateur du rapport"
                      onClick={() => {
                        if (!rowTotal(row.id) || window.confirm(`Retirer ${row.name} et ses heures de ce rapport ?`)) {
                          void actions.removeCollaborator(row.id).catch(() => toast('Suppression impossible.', 'error'))
                        }
                      }}
                      className="rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {present.length === 0 && (
              <tr>
                <td colSpan={columns.length + 4} className="px-2 py-3 text-[13px] text-gray-400">
                  Aucun collaborateur dans ce rapport. Ajoutez l'équipe ci-dessous ou reprenez celle du rapport précédent.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="text-[12px] text-gray-700">
              <td className="border-t border-gray-200 px-2 py-1.5">Total</td>
              {showPrices && <td className="border-t border-gray-200" />}
              {columns.map((column) => (
                <td key={column.key} className="border-t border-gray-200 px-1 py-1.5 text-right tabular-nums">
                  {columnTotal(column) ? fmtAmount(columnTotal(column), stepKeys.has(column.key) || column.workType?.unit === 'h' ? 2 : 0) : ''}
                </td>
              ))}
              <td className="border-t border-gray-200 bg-gray-100 px-2 py-1.5 text-right font-semibold tabular-nums">{fmtAmount(report.total_hours)}</td>
              {showPrices && <td className="border-t border-gray-200 px-2 py-1.5 text-right font-semibold tabular-nums">{fmtAmount(report.total_amount ?? 0)}</td>}
              <td className="border-t border-gray-200" />
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly && (
        <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-3 py-2">
          <Icon name="users" className="h-4 w-4 text-gray-400" />
          <BbSelect
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void add()
              }
            }}
            className="w-64"
            aria-label="Ajouter un collaborateur"
          >
            <option value="">— ajouter un collaborateur —</option>
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </BbSelect>
          <button type="button" onClick={() => void add()} disabled={!adding} className="h-8 rounded-md bg-anthracite-800 px-3 text-[13px] font-medium text-white hover:bg-anthracite-700 disabled:opacity-40">
            Ajouter
          </button>
          <button
            type="button"
            onClick={() => void actions.copyTeam().then(() => toast('Équipe du rapport précédent reprise.', 'success')).catch(() => toast("Aucune équipe n'a pu être reprise.", 'error'))}
            className="ml-2 flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-3 text-[13px] text-gray-700 hover:bg-gray-50"
            title="Reprend les collaborateurs du rapport précédent de ce projet, sans leurs heures"
          >
            <Icon name="refresh" className="h-3.5 w-3.5" />
            Équipe du rapport précédent
          </button>
          <span className="ml-auto text-[12px] text-gray-400">Entrée : ligne suivante · flèches : déplacement · enregistré à la sortie de la cellule</span>
        </div>
      )}
    </div>
  )
}
