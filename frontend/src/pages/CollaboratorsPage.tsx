import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useAuth } from '@/auth/AuthContext'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools } from '@/components/baubit/Toolbar'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import GridPager from '@/components/baubit/GridPager'
import { BbCheckbox, BbInput, BbSelect, Field, SectionTitle } from '@/components/baubit/Form'
import { useDebounced } from '@/hooks/useDebounced'
import { useEntityForm, SAVE_LABELS } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import WorkTypesEditor from '@/components/reports/WorkTypesEditor'
import { useSelection } from '@/hooks/useSelection'
import { api } from '@/lib/api'
import { EMPTY_QUERY, PRICE_PATTERN, nullable, toNumber, useDeleteResource, useResourceItem, useResourceList, useSaveResource } from '@/lib/crud'
import type { GridQuery } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { hasRole } from '@/lib/roles'
import { toast } from '@/lib/toast'
import type { Collaborator, Paginated, PriceElement, User } from '@/types'

const FORM_ID = 'collaborator-form'

const COLUMNS: GridColumn<Collaborator>[] = [
  { key: 'number', header: 'N°', value: (c) => c.number, width: 60 },
  { key: 'last_name', header: 'Nom', value: (c) => c.last_name, width: 140 },
  { key: 'first_name', header: 'Prénom', value: (c) => c.first_name, width: 120 },
  { key: 'hourly_cost', header: 'Coût h.', value: (c) => c.hourly_cost ?? null, type: 'number', width: 64 },
  { key: 'regie', header: 'Régie h.', value: (c) => c.effective_regie_price ?? null, type: 'number', width: 64, noFilter: true },
  { key: 'is_active', header: 'Actif', value: (c) => c.is_active, type: 'bool', width: 50, noFilter: true },
]

const schema = z.object({
  number: z.string().max(20),
  last_name: z.string().trim().min(1, 'Le nom est requis.').max(255),
  first_name: z.string().max(255),
  hourly_cost: z.string().regex(PRICE_PATTERN, 'Montant invalide.'),
  regie_element_id: z.string(),
  regie_price: z.string().regex(PRICE_PATTERN, 'Montant invalide.'),
  user_id: z.string(),
  is_active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function toValues(item: Collaborator | null): FormValues {
  return {
    number: item?.number ?? '',
    last_name: item?.last_name ?? '',
    first_name: item?.first_name ?? '',
    hourly_cost: item?.hourly_cost != null ? String(item.hourly_cost) : '',
    regie_element_id: item?.regie_element_id ? String(item.regie_element_id) : '',
    regie_price: item?.regie_price != null ? String(item.regie_price) : '',
    user_id: item?.user_id ? String(item.user_id) : '',
    is_active: item?.is_active ?? true,
  }
}

/** Collaborateurs de l'entreprise : liste, fiche avec tarif horaire et compte de connexion. */
export default function CollaboratorsPage() {
  const { selectedId, isNew, select } = useSelection()
  const [query, setQuery] = useState<GridQuery>(EMPTY_QUERY)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const list = useResourceList<Collaborator>('collaborators', useDebounced(query, 250))
  const item = useResourceItem<Collaborator>('collaborators', selectedId)
  const remove = useDeleteResource('collaborators')
  const current = isNew ? null : (item.data ?? null)

  function onDelete() {
    if (current && window.confirm(`Supprimer ${current.name} ?`)) {
      remove.mutate(current.id, { onSuccess: () => select(null), onError: () => toast('Suppression impossible.', 'error') })
    }
  }

  return (
    <Workspace
      asideWidth={480}
      tabLabel="Collaborateurs"
      entries={list.data?.meta.total ?? null}
      statusRight={SAVE_LABELS[saveState]}
      toolbar={<StandardTools newLabel="Nouveau collaborateur" onNew={() => select('new')} formId={FORM_ID} onDelete={onDelete} canDelete={Boolean(current)} />}
      aside={
        <AsidePanel title="Collaborateurs">
          <DataGrid
            className="mt-1 rounded-lg border border-gray-200"
            columns={COLUMNS}
            rows={list.data?.data ?? []}
            rowKey={(row) => String(row.id)}
            rowClass={(row) => (row.is_active ? undefined : 'text-gray-400')}
            selectedKey={selectedId === null ? null : String(selectedId)}
            onSelect={(row) => select(row.id)}
            query={{ filters: query.filters, sort: query.sort }}
            onQueryChange={(state) => setQuery({ ...state, page: 1 })}
            emptyText={list.isLoading ? 'Chargement…' : 'Aucun collaborateur.'}
          />
          <GridPager meta={list.data?.meta} onPage={(page) => setQuery({ ...query, page })} loading={list.isFetching} />
        </AsidePanel>
      }
    >
      <div className="flex h-full gap-10 overflow-auto p-5">
        {isNew || current ? (
          <CollaboratorForm key={current?.id ?? 'new'} item={current} isNew={isNew} onStateChange={setSaveState} onCreated={(created) => select(created.id)} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-[13px] text-gray-400">Choisissez un collaborateur ou créez-en un nouveau.</div>
        )}
        <div className="w-[420px] shrink-0">
          <WorkTypesEditor />
        </div>
      </div>
    </Workspace>
  )
}

interface CollaboratorFormProps {
  item: Collaborator | null
  isNew: boolean
  onStateChange: (state: SaveState) => void
  onCreated: (item: Collaborator) => void
}

function CollaboratorForm({ item, isNew, onStateChange, onCreated }: CollaboratorFormProps) {
  const { user } = useAuth()
  const isAdmin = hasRole(user, ['admin'])
  const save = useSaveResource<Collaborator, Record<string, unknown>>('collaborators')
  const users = useQuery({
    queryKey: ['users', 'options'],
    queryFn: async () => (await api.get<Paginated<User>>('/users', { params: { per_page: 500 } })).data.data,
    enabled: isAdmin,
    staleTime: 60_000,
  })
  const regiePositions = useQuery({
    queryKey: ['price-elements', 'regie-positions'],
    queryFn: async () => (await api.get<Paginated<PriceElement>>('/price-elements', { params: { family: 1, per_page: 500, sort: 'number' } })).data.data,
    staleTime: 60_000,
  })
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(item) })
  const { register, formState, control } = form
  const errors = formState.errors
  const regieElementId = useWatch({ control, name: 'regie_element_id' })
  const regiePriceText = useWatch({ control, name: 'regie_price' })
  const position = (regiePositions.data ?? []).find((element) => String(element.id) === regieElementId) ?? null
  const ownRegie = toNumber(regiePriceText)
  const effectiveRegie = ownRegie ?? position?.regie_price ?? null

  const { submit, onBlur } = useEntityForm(form, {
    isNew,
    onStateChange,
    save: async (values) => {
      const payload = {
        number: nullable(values.number),
        last_name: values.last_name.trim(),
        first_name: nullable(values.first_name),
        hourly_cost: toNumber(values.hourly_cost),
        regie_element_id: values.regie_element_id ? Number(values.regie_element_id) : null,
        regie_price: toNumber(values.regie_price),
        ...(isAdmin ? { user_id: values.user_id ? Number(values.user_id) : null } : {}),
        is_active: values.is_active,
      }
      const saved = await save.mutateAsync({ id: item?.id ?? null, payload })
      if (!item) {
        onCreated(saved)
      }
    },
  })

  return (
    <form id={FORM_ID} onSubmit={submit} onBlur={onBlur} className="w-[520px] space-y-2">
      <SectionTitle>{isNew ? 'Nouveau collaborateur' : item?.name}</SectionTitle>
      <Field label="Numéro">
        <BbInput {...register('number')} className="w-28" maxLength={20} />
      </Field>
      <Field label="Nom">
        <BbInput {...register('last_name')} invalid={Boolean(errors.last_name)} className="w-64" autoFocus={isNew} />
      </Field>
      <Field label="Prénom">
        <BbInput {...register('first_name')} className="w-64" />
      </Field>
      <Field label="Tarif horaire (coût)">
        <BbInput {...register('hourly_cost')} invalid={Boolean(errors.hourly_cost)} inputMode="decimal" className="w-28 text-right" placeholder="52.78" />
        <span className="text-[12px] text-gray-400">CHF / h, coût brut pour l'entreprise</span>
      </Field>
      <Field label="Position régie">
        {/* Remonté quand les positions arrivent : le select reprend alors la valeur du formulaire. */}
        <BbSelect key={regiePositions.data ? 'loaded' : 'loading'} {...register('regie_element_id')} className="w-64" title="Élément de coûts « Salaire » : désignation et tarif régie vendus au client">
          <option value="">— aucune —</option>
          {(regiePositions.data ?? []).map((element) => (
            <option key={element.id} value={element.id}>
              {element.number} · {element.description}
              {element.regie_price != null ? ` · ${fmtAmount(element.regie_price)}` : ''}
            </option>
          ))}
        </BbSelect>
      </Field>
      <Field label="Tarif régie propre">
        <BbInput {...register('regie_price')} invalid={Boolean(errors.regie_price)} inputMode="decimal" className="w-28 text-right" placeholder={position?.regie_price != null ? fmtAmount(position.regie_price) : '90.00'} />
        <span className="text-[12px] text-gray-400">
          {effectiveRegie != null ? `tarif régie appliqué : ${fmtAmount(effectiveRegie)} CHF / h` : 'CHF / h, prioritaire sur la position régie'}
        </span>
      </Field>
      <Field label="Compte de connexion">
        {isAdmin ? (
          <BbSelect {...register('user_id')} className="w-64">
            <option value="">— aucun —</option>
            {(users.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.email})
              </option>
            ))}
          </BbSelect>
        ) : (
          <span className="text-[13px] text-gray-600">{item?.user_email ?? '—'}</span>
        )}
      </Field>
      <Field label="">
        <BbCheckbox label="Actif (proposé dans les rapports)" {...register('is_active')} />
      </Field>
      {errors.last_name && <p className="text-[12px] text-red-600">{errors.last_name.message}</p>}
      {item?.hourly_cost != null && (
        <p className="text-[12px] text-gray-400">
          Journée de 9 h : {fmtAmount(item.hourly_cost * 9)} CHF de coût{effectiveRegie != null ? `, ${fmtAmount(effectiveRegie * 9)} CHF en régie` : ''}.
        </p>
      )}
    </form>
  )
}
