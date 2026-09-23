import { useEffect, useMemo, useRef, useState } from 'react'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { ToolButton, ToolPrimary, ToolSep } from '@/components/baubit/Toolbar'
import { BbCheckbox, BbInput, BbTextarea, Field } from '@/components/baubit/Form'
import BreakdownLinesTable from '@/components/documents/BreakdownLinesTable'
import { Icon } from '@/components/icons'
import { useBreakdownTemplate, useBreakdownTemplates, useDeleteBreakdownTemplate, useSaveBreakdownTemplate } from '@/hooks/useBreakdownTemplates'
import { useSelection } from '@/hooks/useSelection'
import { evaluateLines, hasLabel, insertLine, lineFromData, numberText, toLinePayload } from '@/lib/breakdown'
import type { LineDraft } from '@/lib/breakdown'
import { round2 } from '@/lib/costFamilies'
import { toNumber } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import type { BreakdownTemplate } from '@/types'

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Sous-détails de prix types : la bibliothèque d'ouvrages du métreur (pose carrelage, crépi de fond,
 * coffrage…), chargée dans le sous-détail d'une position de devis. Liste par corps de métier à gauche,
 * fiche avec ses lignes à droite, sauvegarde automatique.
 */
export default function BreakdownTemplatesPage() {
  const { selectedId, isNew, select } = useSelection()
  const [search, setSearch] = useState('')
  const templates = useBreakdownTemplates()
  const item = useBreakdownTemplate(isNew ? null : selectedId)
  const remove = useDeleteBreakdownTemplate()
  const [saveState, setSaveState] = useState('')

  const groups = useMemo(() => {
    const words = normalize(search).split(/\s+/).filter(Boolean)
    const list = (templates.data ?? []).filter((template) => words.every((word) => normalize(`${template.group ?? ''} ${template.name}`).includes(word)))
    const map = new Map<string, BreakdownTemplate[]>()
    for (const template of list) {
      const key = template.group ?? 'Sans groupe'
      map.set(key, [...(map.get(key) ?? []), template])
    }
    return [...map.entries()]
  }, [templates.data, search])

  const current = isNew ? null : (item.data ?? null)

  function onDelete() {
    if (!current || !window.confirm(`Supprimer le sous-détail type « ${current.name} » ?`)) {
      return
    }
    remove.mutate(current.id, {
      onSuccess: () => {
        toast('Modèle supprimé.', 'success')
        select(null)
      },
      onError: () => toast('Suppression impossible.', 'error'),
    })
  }

  return (
    <Workspace
      asideWidth={360}
      tabLabel="Sous-détails types"
      entries={templates.data?.length ?? null}
      statusRight={saveState}
      toolbar={
        <>
          <ToolPrimary label="Nouveau sous-détail type" onClick={() => select('new')} />
          <ToolSep />
          <ToolButton icon="trash" title="Supprimer" tone="danger" onClick={onDelete} disabled={!current} />
        </>
      }
      aside={
        <AsidePanel title="Ouvrages">
          <BbInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un ouvrage…" className="mt-1 w-full" />
          <div className="mt-2 space-y-3">
            {groups.map(([group, list]) => (
              <div key={group}>
                <div className="px-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group}</div>
                <ul className="mt-0.5">
                  {list.map((template) => (
                    <li key={template.id}>
                      <button
                        type="button"
                        onClick={() => select(template.id)}
                        className={`flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left text-[13px] ${
                          template.id === selectedId ? 'bg-primary-50 font-medium text-primary-800' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="truncate">{template.name}</span>
                        <span className="ml-2 shrink-0 text-[11px] text-gray-400">{template.dimension_unit ?? ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {groups.length === 0 && <p className="px-1.5 text-[13px] text-gray-400">{templates.isLoading ? 'Chargement…' : 'Aucun ouvrage.'}</p>}
          </div>
        </AsidePanel>
      }
    >
      {isNew || current ? (
        <TemplateEditor key={current?.id ?? 'new'} template={current} onStateChange={setSaveState} onCreated={(created) => select(created.id)} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-500">
          <Icon name="book" className="h-8 w-8 text-gray-300" />
          <p className="font-medium text-gray-700">Choisissez un ouvrage dans la liste.</p>
          <p className="max-w-md text-[13px]">
            Chaque sous-détail type se charge en un mot dans le sous-détail de prix d'une position de devis, puis se
            recalcule avec la dimension du chantier.
          </p>
        </div>
      )}
    </Workspace>
  )
}

interface Draft {
  group: string
  name: string
  dimension: string
  dimension_unit: string
  price_per_dimension: boolean
  note: string
  lines: LineDraft[]
}

function toDraft(template: BreakdownTemplate | null): Draft {
  return {
    group: template?.group ?? '',
    name: template?.name ?? '',
    dimension: numberText(template?.dimension ?? null),
    dimension_unit: template?.dimension_unit ?? 'm2',
    price_per_dimension: template?.price_per_dimension ?? false,
    note: template?.note ?? '',
    lines: (template?.lines ?? []).map((line) => lineFromData(line)),
  }
}

function serialize(draft: Draft) {
  const payload = {
    group: draft.group.trim() || null,
    name: draft.name.trim(),
    dimension: toNumber(draft.dimension),
    dimension_unit: draft.dimension_unit.trim() || null,
    price_per_dimension: draft.price_per_dimension,
    note: draft.note.trim() || null,
    lines: draft.lines.filter(hasLabel).map(toLinePayload),
  }
  return { payload, serialized: JSON.stringify({ ...payload, lines: payload.lines.map((line) => ({ ...line, id: undefined })) }) }
}

function TemplateEditor({ template, onStateChange, onCreated }: { template: BreakdownTemplate | null; onStateChange: (state: string) => void; onCreated: (template: BreakdownTemplate) => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(template))
  const latest = useRef(draft)
  const saved = useRef(template ? serialize(toDraft(template)).serialized : '')
  const timer = useRef<number | undefined>(undefined)
  const idRef = useRef<number | null>(template?.id ?? null)
  const save = useSaveBreakdownTemplate()

  const dimension = toNumber(draft.dimension)
  const evaluated = useMemo(() => evaluateLines(draft.lines, dimension), [draft.lines, dimension])
  const totalCost = round2(evaluated.reduce((sum, item) => sum + item.cost, 0))
  const totalSale = round2(evaluated.reduce((sum, item) => sum + item.sale, 0))
  const divisor = draft.price_per_dimension && dimension ? dimension : 1

  function update(patch: Partial<Draft> | ((current: Draft) => Draft), delay = 1200) {
    const next = typeof patch === 'function' ? patch(latest.current) : { ...latest.current, ...patch }
    latest.current = next
    setDraft(next)
    onStateChange('Modifications non enregistrées')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void persist(), delay)
  }

  async function persist() {
    window.clearTimeout(timer.current)
    const { payload, serialized } = serialize(latest.current)
    if (!payload.name || serialized === saved.current) {
      return
    }
    saved.current = serialized
    onStateChange('Enregistrement…')
    try {
      const result = await save.mutateAsync({ id: idRef.current, payload })
      const ids = (result.lines ?? []).map((line) => line.id)
      const keys = latest.current.lines.filter(hasLabel).map((line) => line.key)
      const withIds = (lines: LineDraft[]) =>
        lines.map((line) => {
          const index = keys.indexOf(line.key)
          return index >= 0 && line.id === undefined ? { ...line, id: ids[index] } : line
        })
      latest.current = { ...latest.current, lines: withIds(latest.current.lines) }
      setDraft((value) => ({ ...value, lines: withIds(value.lines) }))
      onStateChange('Enregistré')
      if (idRef.current === null) {
        idRef.current = result.id
        onCreated(result)
      }
    } catch {
      saved.current = ''
      onStateChange("Échec de l'enregistrement")
      toast("Le modèle n'a pas pu être enregistré.", 'error')
    }
  }

  const flush = useRef(persist)
  useEffect(() => {
    flush.current = persist
  })
  useEffect(() => () => void flush.current(), [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void flush.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const updateLine = (key: number, patch: Partial<LineDraft>) =>
    update((current) => ({ ...current, lines: current.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)) }))

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && void persist()}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <Field label="Ouvrage" labelWidth={70}>
          <BbInput value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="Pose carrelage + fourniture" className="w-80" maxLength={255} autoFocus={!template} />
        </Field>
        <Field label="Groupe" labelWidth={60}>
          <BbInput value={draft.group} onChange={(e) => update({ group: e.target.value })} placeholder="Carrelage" className="w-48" maxLength={80} list="breakdown-groups" />
        </Field>
        <Field label="DIM" labelWidth={40}>
          <BbInput value={draft.dimension} onChange={(e) => update({ dimension: e.target.value })} inputMode="decimal" placeholder="9" className="w-20 text-right" title="Dimension de référence par défaut" />
          <BbInput value={draft.dimension_unit} onChange={(e) => update({ dimension_unit: e.target.value })} placeholder="m2" className="w-20" maxLength={20} />
        </Field>
        <BbCheckbox label={`Prix par ${draft.dimension_unit || 'unité'} (total ÷ DIM)`} checked={draft.price_per_dimension} onChange={(e) => update({ price_per_dimension: e.target.checked }, 0)} />
      </div>
      <div className="flex items-start gap-2">
        <span className="w-[70px] shrink-0 pt-1.5 text-[13px] text-gray-500">Remarque</span>
        <BbTextarea value={draft.note} onChange={(e) => update({ note: e.target.value })} rows={2} maxLength={2000} className="w-full max-w-[800px]" placeholder="Prix visé, source des prix, variantes…" />
      </div>

      <BreakdownLinesTable
        evaluated={evaluated}
        className="max-h-none flex-1"
        onUpdateLine={updateLine}
        onAddLine={(line) => update((current) => ({ ...current, lines: insertLine(current.lines, line) }))}
        onRemoveLine={(key) => update((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) }), 300)}
      />

      <dl className="ml-auto grid w-[360px] grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[13px]">
        <dt className="text-gray-500">Coût total pour la DIM de référence</dt>
        <dd className="text-right tabular-nums">{fmtAmount(totalCost)}</dd>
        <dt className="font-medium text-gray-700">Vente calculée{divisor !== 1 ? ` (par ${draft.dimension_unit})` : ''}</dt>
        <dd className="text-right font-semibold tabular-nums text-primary-800">{fmtAmount(round2(totalSale / divisor))}</dd>
      </dl>
    </div>
  )
}
