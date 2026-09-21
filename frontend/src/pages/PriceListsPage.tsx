import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
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
import { fmtAmount } from '@/lib/format'
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
  { key: 'unit_regie', header: 'Un. régie', value: (e) => e.unit_regie, width: 90 },
  { key: 'supplier_price', header: 'Prix fourn.', value: (e) => e.supplier_price, type: 'number', width: 100 },
  { key: 'net_price', header: 'Net', value: (e) => e.net_price, type: 'number', width: 100 },
  { key: 'regie_price', header: 'Prix régie', value: (e) => e.regie_price, type: 'number', width: 100 },
  { key: 'regie_code', header: 'Tarif régie', value: (e) => e.regie_code, width: 110 },
  {
    key: 'margin',
    header: 'Majoration',
    value: (e) => (e.net_price && e.regie_price ? ((e.regie_price - e.net_price) / e.net_price) * 100 : null),
    width: 100,
    align: 'right',
    noFilter: true,
    render: (e) =>
      e.net_price && e.regie_price ? (
        <span className="text-gray-500">{fmtAmount(((e.regie_price - e.net_price) / e.net_price) * 100, 1)} %</span>
      ) : (
        ''
      ),
  },
]

const price = z.string().regex(PRICE_PATTERN, 'Prix invalide.')

const schema = z.object({
  family: z.string(),
  group_code: z.string().max(20),
  number: z.string().trim().min(1, 'Le numéro est requis.').max(30),
  description: z.string().trim().min(1, 'La description est requise.').max(500),
  unit: z.string().max(20),
  unit_regie: z.string().max(20),
  supplier_price: price,
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
    unit_regie: element?.unit_regie ?? '',
    supplier_price: text(element?.supplier_price),
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
          defaultGroup={group}
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
          unit_regie: nullable(values.unit_regie) ?? nullable(values.unit),
          supplier_price: toNumber(values.supplier_price),
          net_price: toNumber(values.net_price) ?? toNumber(values.supplier_price),
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
          <span className="ml-2 text-gray-500">Un. régie</span>
          <BbInput className="w-24" {...register('unit_regie')} />
        </Field>
        <Field label="Prix fournisseur" labelWidth={110}>
          <BbInput className="w-28 text-right" invalid={Boolean(errors.supplier_price)} {...register('supplier_price')} />
        </Field>

        <Field label="Groupe / N°" labelWidth={90}>
          <BbInput className="w-20" {...register('group_code')} />
          <BbInput className="w-[136px]" autoFocus={isNew} invalid={Boolean(errors.number)} {...register('number')} />
        </Field>
        <Field label="Tarif régie" labelWidth={90}>
          <BbInput className="w-56" {...register('regie_code')} />
        </Field>
        <Field label="Prix net" labelWidth={110}>
          <BbInput className="w-28 text-right" invalid={Boolean(errors.net_price)} {...register('net_price')} />
        </Field>

        <Field label="Description" labelWidth={90} className="col-span-2">
          <BbInput className="w-[590px]" invalid={Boolean(errors.description)} {...register('description')} />
        </Field>
        <Field label="Prix régie (majoré)" labelWidth={110}>
          <BbInput className="w-28 text-right" invalid={Boolean(errors.regie_price)} {...register('regie_price')} />
        </Field>
      </fieldset>
      {firstError && <p className="mt-2 text-[12px] text-red-600">{firstError}</p>}
    </form>
  )
}
