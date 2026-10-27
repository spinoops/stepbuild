import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import GridPager from '@/components/baubit/GridPager'
import { BbInput, BbSelect, Field, SectionTitle } from '@/components/baubit/Form'
import { useDebounced } from '@/hooks/useDebounced'
import { SAVE_LABELS, useEntityForm } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import { useSelection } from '@/hooks/useSelection'
import { api } from '@/lib/api'
import {
  EMPTY_QUERY,
  PRICE_PATTERN,
  nullable,
  toNumber,
  useDeleteResource,
  useResourceItem,
  useResourceList,
  useSaveResource,
} from '@/lib/crud'
import type { GridQuery } from '@/lib/crud'
import { fmtAmount, fmtDate } from '@/lib/format'
import { PRICE_FAMILIES } from '@/lib/prices'
import { toast } from '@/lib/toast'
import type { PriceElement } from '@/types'

const FORM_ID = 'price-element-form'
const ALL = '1…6 - Tous'
const TABS = [...PRICE_FAMILIES.map((family) => family.label), ALL]

const COLUMNS: GridColumn<PriceElement>[] = [
  { key: 'group_code', header: 'Grp.', value: (e) => e.group_code, width: 70 },
  { key: 'number', header: 'N° élément', value: (e) => e.number, width: 110 },
  { key: 'description', header: 'Description', value: (e) => e.description, width: 460 },
  { key: 'unit', header: 'Un.', value: (e) => e.unit, width: 70 },
  // Deux prix seulement (demande du 26.10.2026) : achat = prix net (coût), vente = prix régie (facturé).
  // Le prix fournisseur reste en base (reprises BauBit) mais n'est plus affiché ni saisi.
  { key: 'net_price', header: "Prix d'achat", value: (e) => e.net_price, type: 'number', width: 100 },
  { key: 'regie_price', header: 'Prix de vente', value: (e) => e.regie_price, type: 'number', width: 100 },
  {
    key: 'price_updated_at',
    header: 'Prix du',
    value: (e) => e.price_updated_at,
    width: 90,
    noFilter: true,
    render: (e) => (e.price_updated_at ? <span className="text-gray-500">{fmtDate(e.price_updated_at)}</span> : ''),
  },
  {
    key: 'margin',
    header: 'Majoration',
    value: (e) => (e.net_price && e.regie_price ? ((e.regie_price - e.net_price) / e.net_price) * 100 : null),
    width: 130,
    align: 'right',
    noFilter: true,
    render: (e) => <MarkupCell element={e} />,
  },
]

const price = z.string().regex(PRICE_PATTERN, 'Prix invalide.')

const schema = z.object({
  family: z.string(),
  group_code: z.string().max(20),
  number: z.string().trim().min(1, 'Le numéro est requis.').max(30),
  description: z.string().trim().min(1, 'La description est requise.').max(500),
  unit: z.string().max(20),
  net_price: price,
  regie_price: price,
  regie_code: z.string().max(30),
})

type FormValues = z.infer<typeof schema>

const text = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value))

function toValues(element: PriceElement | null, family: number): FormValues {
  return {
    family: String(element?.family ?? family),
    group_code: element?.group_code ?? '',
    number: element?.number ?? '',
    description: element?.description ?? '',
    unit: element?.unit ?? '',
    net_price: text(element?.net_price),
    regie_price: text(element?.regie_price),
    regie_code: element?.regie_code ?? '',
  }
}

/** Éléments de coûts : onglets par famille, groupes à gauche, fiche et grille branchées sur l'API. */
export default function PriceListsPage() {
  const { selectedId, isNew, select } = useSelection()
  const [tab, setTab] = useState<string>(PRICE_FAMILIES[1].label)
  const [group, setGroup] = useState<string | null>(null)
  const [query, setQuery] = useState<GridQuery>(EMPTY_QUERY)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [formVersion, setFormVersion] = useState(0)

  const family = PRICE_FAMILIES.find((item) => item.label === tab)?.id ?? null
  const list = useResourceList<PriceElement>('price-elements', useDebounced(query, 250), { family, group })
  const rows = list.data?.data ?? []
  const remove = useDeleteResource('price-elements')

  const groups = useQuery({
    queryKey: ['price-elements', 'groups', family],
    queryFn: async () =>
      (await api.get<{ data: { code: string; total: number }[] }>('/price-elements/groups', { params: family ? { family } : {} })).data.data,
  })

  // Nouvel élément sans groupe choisi : le groupe le plus fourni de la famille (M92 pour les matériaux…).
  const biggestGroup = (groups.data ?? []).reduce<{ code: string; total: number } | null>((best, item) => (best && best.total >= item.total ? best : item), null)?.code ?? null

  const currentId = isNew ? null : (selectedId ?? rows[0]?.id ?? null)
  const inList = rows.find((row) => row.id === currentId) ?? null
  const single = useResourceItem<PriceElement>('price-elements', currentId, !inList)
  const element = isNew ? null : (inList ?? single.data ?? null)

  function onDelete() {
    if (!element || !window.confirm(`Supprimer l'élément « ${element.description} » ?`)) {
      return
    }
    remove.mutate(element.id, {
      onSuccess: () => {
        toast('Élément supprimé.', 'success')
        select(null)
      },
    })
  }

  return (
    <Workspace
      entries={list.data?.meta.total ?? null}
      statusRight={SAVE_LABELS[saveState]}
      tabLabel="Eléments de coûts"
      toolbar={
        <>
          <StandardTools
            newLabel="Nouvel élément"
            onNew={() => {
              select('new')
              setSaveState('idle')
            }}
            formId={FORM_ID}
            onUndo={() => {
              setFormVersion((value) => value + 1)
              setSaveState('idle')
            }}
            onDelete={onDelete}
            canDelete={Boolean(element)}
          />
          <ToolMenu icon="import" label="Importer une liste de prix" />
          <ToolMenu icon="export" label="Export" />
          <ToolSep />
        </>
      }
      aside={
        <AsidePanel nav={[{ icon: 'tree', label: 'Groupes', active: true }]}>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Groupes</div>
          <ul className="mt-2 space-y-0.5">
            <li>
              <GroupButton label="Tous les groupes" active={group === null} onClick={() => setGroup(null)} />
            </li>
            {(groups.data ?? []).map((item) => (
              <li key={item.code}>
                <GroupButton
                  label={item.code}
                  total={item.total}
                  active={group === item.code}
                  onClick={() => {
                    setGroup(item.code)
                    setQuery({ ...query, page: 1 })
                  }}
                />
              </li>
            ))}
          </ul>
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <TabStrip
          tabs={TABS}
          active={tab}
          onChange={(value) => {
            setTab(value)
            setGroup(null)
            setQuery({ ...query, page: 1 })
            select(null)
          }}
          className="shrink-0 px-4"
        />
        <ElementForm
          key={`${isNew ? 'new' : (element?.id ?? 'none')}-${formVersion}`}
          element={element}
          isNew={isNew}
          defaultFamily={family ?? 2}
          defaultGroup={group ?? biggestGroup}
          disabled={!isNew && !element}
          onStateChange={setSaveState}
          onCreated={(created) => select(created.id)}
        />
        <DataGrid
          className="min-h-0 flex-1"
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => String(row.id)}
          selectedKey={currentId ? String(currentId) : null}
          onSelect={(row) => {
            select(row.id)
            setSaveState('idle')
          }}
          query={query}
          onQueryChange={(next) => setQuery({ ...next, page: 1 })}
          emptyText={list.isLoading ? 'Chargement…' : 'Aucun élément dans cette famille.'}
          storageKey="price-elements"
        />
        <GridPager meta={list.data?.meta} onPage={(page) => setQuery({ ...query, page })} loading={list.isFetching} />
      </div>
    </Workspace>
  )
}

function GroupButton({ label, total, active, onClick }: { label: string; total?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition ${
        active ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="truncate">{label}</span>
      {total !== undefined && <span className="ml-auto rounded-full bg-gray-100 px-1.5 text-[11px] text-gray-500">{total}</span>}
    </button>
  )
}

/** Prochain numéro libre de la famille et du groupe (multiple de 5 au-dessus du plus grand, comme dans BauBit). */
async function fetchNextElementNumber(family: string, group: string): Promise<string> {
  return (await api.get<{ number: string }>('/price-elements/next-number', { params: { family, ...(group.trim() ? { group: group.trim() } : {}) } })).data.number
}

interface ElementFormProps {
  element: PriceElement | null
  isNew: boolean
  defaultFamily: number
  defaultGroup: string | null
  disabled: boolean
  onStateChange: (state: SaveState) => void
  onCreated: (element: PriceElement) => void
}

function ElementForm({ element, isNew, defaultFamily, defaultGroup, disabled, onStateChange, onCreated }: ElementFormProps) {
  const save = useSaveResource<PriceElement, Record<string, unknown>>('price-elements')
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...toValues(element, defaultFamily), ...(element ? {} : { group_code: defaultGroup ?? '' }) },
  })
  const { register, formState } = form
  const errors = formState.errors
  const firstError = Object.values(errors)[0]?.message

  // Nouvel élément : le numéro est proposé d'après la famille et le groupe, et suit tant qu'il n'a pas été modifié.
  const [watchFamily, watchGroup] = useWatch({ control: form.control, name: ['family', 'group_code'] })
  const proposed = useRef('')
  const request = useRef(0) // seule la dernière demande compte (famille changée pendant qu'une réponse arrive)
  async function suggestNumber() {
    const current = form.getValues('number').trim()
    if (!isNew || (current && current !== proposed.current)) {
      return
    }
    const id = ++request.current
    try {
      const number = await fetchNextElementNumber(watchFamily, watchGroup ?? '')
      if (id !== request.current) {
        return
      }
      proposed.current = number
      form.setValue('number', number, { shouldDirty: true, shouldValidate: true })
    } catch {
      // Pas de proposition : l'utilisateur saisit le numéro à la main.
    }
  }
  useEffect(() => {
    void suggestNumber()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, watchFamily, watchGroup])
  // Le groupe proposé (le plus fourni de la famille) arrive après le montage : il remplit le champ s'il est vide.
  const proposedGroup = useRef('')
  useEffect(() => {
    if (isNew && defaultGroup && !form.getValues('group_code').trim()) {
      proposedGroup.current = defaultGroup
      form.setValue('group_code', defaultGroup)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, defaultGroup])
  // Famille changée dans la fiche : un groupe seulement proposé (M92…) n'a plus de sens, il est vidé.
  const mountedFamily = useRef(watchFamily)
  useEffect(() => {
    if (isNew && watchFamily !== mountedFamily.current && form.getValues('group_code') === proposedGroup.current) {
      proposedGroup.current = ''
      form.setValue('group_code', '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, watchFamily])

  const { submit, onBlur } = useEntityForm(form, {
    isNew,
    onStateChange,
    save: async (values) => {
      const saved = await save.mutateAsync({
        id: element?.id ?? null,
        payload: {
          family: Number(values.family),
          group_code: nullable(values.group_code),
          number: values.number.trim(),
          description: values.description.trim(),
          unit: nullable(values.unit),
          supplier_price: element?.supplier_price ?? null, // conservé tel quel (reprise BauBit), plus saisi
          net_price: toNumber(values.net_price),
          regie_price: toNumber(values.regie_price),
          regie_code: nullable(values.regie_code),
        },
      })
      if (!element) {
        toast('Élément créé.', 'success')
        onCreated(saved)
      }
    },
  })

  return (
    <form id={FORM_ID} onSubmit={submit} onBlur={onBlur} className="shrink-0 border-b border-gray-200 px-4 pb-4 pt-4">
      <SectionTitle>{isNew ? 'Nouvel élément de coût' : 'Élément de coût'}</SectionTitle>
      <fieldset disabled={disabled} className="grid grid-cols-[max-content_max-content_max-content] gap-x-12 gap-y-2">
        <Field label="Famille" labelWidth={90}>
          <BbSelect className="w-56" {...register('family')}>
            {PRICE_FAMILIES.map((family) => (
              <option key={family.id} value={family.id}>
                {family.label}
              </option>
            ))}
          </BbSelect>
        </Field>
        <Field label="Unité" labelWidth={90}>
          <BbInput className="w-24" {...register('unit')} />
        </Field>
        <Field label="Prix d'achat" labelWidth={110}>
          <BbInput className="w-28 text-right" invalid={Boolean(errors.net_price)} {...register('net_price')} />
        </Field>

        <Field label="Groupe / N°" labelWidth={90}>
          <BbInput className="w-20" {...register('group_code')} />
          <BbInput className="w-[136px]" invalid={Boolean(errors.number)} title={isNew ? 'Numéro attribué automatiquement : le suivant du groupe. Modifiable.' : undefined} {...register('number')} />
        </Field>
        <Field label="Code régie" labelWidth={90}>
          <BbInput className="w-56" {...register('regie_code')} />
        </Field>
        <Field label="Prix de vente" labelWidth={110}>
          <BbInput className="w-28 text-right" invalid={Boolean(errors.regie_price)} {...register('regie_price')} />
        </Field>

        <Field label="Description" labelWidth={90} className="col-span-2">
          <BbInput className="w-[590px]" autoFocus={isNew} invalid={Boolean(errors.description)} {...register('description')} />
        </Field>
        <div className="flex items-center text-[12px] text-gray-500">{element?.price_updated_at && `Prix du ${fmtDate(element.price_updated_at)}`}</div>
      </fieldset>
      {firstError && <p className="mt-2 text-[12px] text-red-600">{firstError}</p>}
    </form>
  )
}

/** Majoration du prix de vente sur le prix d'achat, en % (null sans l'un des deux prix). */
function markupOf(element: PriceElement): number | null {
  return element.net_price && element.regie_price !== null ? ((element.regie_price - element.net_price) / element.net_price) * 100 : null
}

/**
 * Cellule « Majoration » de la liste : un clic ouvre une tirette ; la majoration choisie recalcule le prix
 * de vente (prix d'achat × (1 + majoration), arrondi à 5 ct) et l'enregistre quand on relâche la tirette, qu'on
 * valide le champ ou qu'on clique un raccourci. Sans prix d'achat, rien à majorer.
 */
function MarkupCell({ element }: { element: PriceElement }) {
  const save = useSaveResource<PriceElement, Record<string, unknown>>('price-elements')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<number | null>(null)
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const current = markupOf(element)
  const shown = draft ?? Math.round((current ?? 0) * 10) / 10
  const net = element.net_price ?? 0
  const projected = Math.round(net * (1 + shown / 100) * 20) / 20

  // Clic hors de la tirette : elle se referme sans enregistrer.
  useEffect(() => {
    if (!open) {
      return
    }
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (!button.current?.contains(target) && !document.getElementById(`markup-${element.id}`)?.contains(target)) {
        setOpen(false)
        setDraft(null)
      }
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open, element.id])

  function toggle(event: React.MouseEvent) {
    event.stopPropagation()
    if (!net) {
      return
    }
    const rect = button.current?.getBoundingClientRect()
    setAnchor(rect ? { top: rect.bottom + 4, right: window.innerWidth - rect.right } : null)
    setOpen((value) => !value)
    setDraft(null)
  }

  /** Enregistre le prix de vente correspondant à la majoration donnée (si elle change). */
  function apply(value: number) {
    setDraft(null)
    if (Math.abs(value - (current ?? 0)) < 0.05) {
      return
    }
    const regie = Math.round(net * (1 + value / 100) * 20) / 20
    save.mutate(
      {
        id: element.id,
        payload: {
          family: element.family,
          group_code: element.group_code,
          number: element.number,
          description: element.description,
          unit: element.unit,
          unit_regie: element.unit_regie,
          supplier_price: element.supplier_price,
          net_price: element.net_price,
          regie_price: regie,
          regie_code: element.regie_code,
          unit_factor: element.unit_factor,
          discount_amount: element.discount_amount,
          discount_percent: element.discount_percent,
        },
      },
      {
        onSuccess: () => toast(`Prix de vente de ${element.number} : ${fmtAmount(regie)} (achat + ${fmtAmount(value, 1)} %).`, 'success'),
        onError: () => toast("La majoration n'a pas pu être enregistrée.", 'error'),
      },
    )
  }

  const commit = () => {
    if (draft !== null) {
      apply(draft)
    }
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        disabled={!net}
        title={net ? 'Cliquer pour régler la majoration avec une tirette' : "Pas de prix d'achat : rien à majorer"}
        className={`h-7 w-full rounded px-1.5 text-right tabular-nums transition ${
          net ? 'text-gray-600 hover:bg-primary-50 hover:text-primary-800' : 'cursor-default text-gray-300'
        } ${open ? 'bg-primary-50 text-primary-800' : ''}`}
      >
        {current !== null ? `${fmtAmount(current, 1)} %` : net ? '—' : ''}
      </button>
      {open && anchor && (
        <div
          id={`markup-${element.id}`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              setDraft(null)
            }
          }}
          style={{ position: 'fixed', top: anchor.top, right: anchor.right }}
          className="z-50 w-[300px] rounded-lg border border-gray-200 bg-white p-3 text-[12px] shadow-xl"
        >
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-semibold text-gray-700">Majoration sur le prix d'achat</span>
            <span className="text-gray-400">achat {fmtAmount(net)}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={200}
              step={1}
              value={Math.min(200, Math.max(0, shown))}
              onChange={(event) => setDraft(Number(event.target.value))}
              onPointerUp={commit}
              onKeyUp={(event) => (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Enter') && commit()}
              autoFocus
              aria-label="Majoration en pour-cent"
              className="flex-1 accent-primary-600"
            />
            <input
              type="number"
              min={0}
              max={500}
              step={1}
              value={Math.round(shown * 10) / 10}
              onChange={(event) => setDraft(event.target.value === '' ? 0 : Number(event.target.value))}
              onKeyDown={(event) => event.key === 'Enter' && commit()}
              onBlur={commit}
              aria-label="Majoration"
              className="h-7 w-16 rounded-md border border-gray-300 px-1 text-right tabular-nums outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <span className="text-gray-500">%</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-gray-500">Prix de vente</span>
            <span className={`text-[14px] font-semibold tabular-nums ${draft !== null ? 'text-primary-800' : 'text-gray-800'}`}>{fmtAmount(projected)}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {[0, 10, 20, 30, 50].map((value) => (
              <button key={value} type="button" onClick={() => apply(value)} className="h-6 rounded-full border border-gray-200 px-2 text-[11px] text-gray-600 hover:bg-gray-100">
                {value} %
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Enregistré au relâchement de la tirette ou à la validation du champ.</p>
        </div>
      )}
    </>
  )
}
