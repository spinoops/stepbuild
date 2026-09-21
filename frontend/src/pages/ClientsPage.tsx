import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import GridPager from '@/components/baubit/GridPager'
import { BbCheckbox, BbInput, BbSelect, BbTextarea, Field, SectionTitle } from '@/components/baubit/Form'
import Badge from '@/components/ui/Badge'
import { useDebounced } from '@/hooks/useDebounced'
import { SAVE_LABELS, useEntityForm } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import { useSelection } from '@/hooks/useSelection'
import { EMPTY_QUERY, nullable, useDeleteResource, useResourceItem, useResourceList, useSaveResource } from '@/lib/crud'
import type { GridQuery } from '@/lib/crud'
import { ADDRESS_TYPES, addressTypeLabel } from '@/lib/prices'
import { toast } from '@/lib/toast'
import type { Address, AddressType } from '@/types'

const FORM_ID = 'address-form'

const TYPE_TONES: Record<AddressType, 'primary' | 'amber' | 'blue' | 'gray'> = {
  client: 'primary',
  fournisseur: 'amber',
  sous_traitant: 'blue',
  contact: 'gray',
}

const COLUMNS: GridColumn<Address>[] = [
  {
    key: 'type',
    header: 'Type',
    value: (a) => addressTypeLabel(a.type),
    width: 120,
    noFilter: true,
    render: (a) => <Badge tone={TYPE_TONES[a.type]}>{addressTypeLabel(a.type)}</Badge>,
  },
  { key: 'title', header: 'Titre', value: (a) => a.title, width: 90 },
  { key: 'last_name', header: 'Nom', value: (a) => a.last_name, width: 220 },
  { key: 'first_name', header: 'Prénom', value: (a) => a.first_name, width: 120 },
  { key: 'street', header: 'Rue', value: (a) => a.street, width: 180 },
  { key: 'street_no', header: 'N°', value: (a) => a.street_no, width: 60 },
  { key: 'zip', header: 'NPA', value: (a) => a.zip, width: 70 },
  { key: 'city', header: 'Lieu', value: (a) => a.city, width: 130 },
  { key: 'phone', header: 'Téléphone', value: (a) => a.phone, width: 130 },
  { key: 'email', header: 'eMail', value: (a) => a.email, width: 220 },
  { key: 'is_active', header: 'Actif', value: (a) => a.is_active, type: 'bool', width: 60 },
]

const schema = z.object({
  type: z.enum(['client', 'fournisseur', 'sous_traitant', 'contact']),
  is_active: z.boolean(),
  title: z.string().max(30),
  last_name: z.string().trim().min(1, 'Le nom est requis.').max(255),
  first_name: z.string().max(255),
  designation: z.string().max(255),
  street: z.string().max(255),
  street_no: z.string().max(20),
  zip: z.string().max(10),
  city: z.string().max(255),
  phone: z.string().max(40),
  mobile: z.string().max(40),
  email: z.string().email('Email invalide.').or(z.literal('')),
  debtor_no: z.string().max(40),
  remark: z.string().max(5000),
})

type FormValues = z.infer<typeof schema>

function toValues(address: Address | null): FormValues {
  return {
    type: address?.type ?? 'client',
    is_active: address?.is_active ?? true,
    title: address?.title ?? '',
    last_name: address?.last_name ?? '',
    first_name: address?.first_name ?? '',
    designation: address?.designation ?? '',
    street: address?.street ?? '',
    street_no: address?.street_no ?? '',
    zip: address?.zip ?? '',
    city: address?.city ?? '',
    phone: address?.phone ?? '',
    mobile: address?.mobile ?? '',
    email: address?.email ?? '',
    debtor_no: address?.debtor_no ?? '',
    remark: address?.remark ?? '',
  }
}

/** Adresses : carnet centralisé (clients, fournisseurs, sous-traitants, contacts), branché sur l'API. */
export default function ClientsPage() {
  const { selectedId, isNew, select } = useSelection()
  const [onlyActive, setOnlyActive] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'' | AddressType>('')
  const [query, setQuery] = useState<GridQuery>(EMPTY_QUERY)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [formVersion, setFormVersion] = useState(0)

  const list = useResourceList<Address>('addresses', useDebounced(query, 250), { type: typeFilter, active: onlyActive })
  const rows = list.data?.data ?? []
  const remove = useDeleteResource('addresses')

  // Sans sélection explicite, la première ligne est affichée.
  const currentId = isNew ? null : (selectedId ?? rows[0]?.id ?? null)
  const inList = rows.find((row) => row.id === currentId) ?? null
  const single = useResourceItem<Address>('addresses', currentId, !inList)
  const address = isNew ? null : (inList ?? single.data ?? null)

  function onDelete() {
    if (!address || !window.confirm(`Supprimer l'adresse « ${address.last_name} ${address.first_name ?? ''} » ?`)) {
      return
    }
    remove.mutate(address.id, {
      onSuccess: () => {
        toast('Adresse supprimée.', 'success')
        select(null)
      },
    })
  }

  return (
    <Workspace
      entries={list.data?.meta.total ?? null}
      statusRight={SAVE_LABELS[saveState]}
      tabLabel={onlyActive ? 'Adresses - Seulement actifs' : 'Adresses'}
      toolbar={
        <>
          <StandardTools
            newLabel="Nouvelle adresse"
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
            canDelete={Boolean(address)}
          />
          <ToolMenu icon="import" label="Import" />
          <ToolMenu icon="export" label="Export" />
          <ToolSep />
          <BbCheckbox
            label="Seulement actifs"
            checked={onlyActive}
            onChange={(event) => {
              setOnlyActive(event.target.checked)
              setQuery({ ...query, page: 1 })
            }}
            className="ml-1"
          />
          <BbSelect
            className="ml-3 w-44"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as '' | AddressType)
              setQuery({ ...query, page: 1 })
            }}
          >
            <option value="">Tous les types</option>
            {ADDRESS_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </BbSelect>
        </>
      }
      aside={
        <AsidePanel nav={[{ icon: 'contacts', label: 'Adresses', active: true }, { icon: 'users', label: 'Personnes de contact' }]}>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Fiche</div>
          {address ? (
            <div className="mt-2 space-y-0.5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-[13px]">
              <div className="font-semibold">
                {address.title} {address.last_name} {address.first_name}
              </div>
              <div>
                {address.street} {address.street_no}
              </div>
              <div>
                {address.zip} {address.city}
              </div>
              {address.phone && <div className="mt-1">{address.phone}</div>}
              {address.mobile && <div>{address.mobile}</div>}
              {address.email && (
                <a href={`mailto:${address.email}`} className="block truncate text-primary-700 hover:underline">
                  {address.email}
                </a>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-gray-400">{isNew ? 'Nouvelle adresse en cours de saisie.' : 'Aucune adresse sélectionnée.'}</p>
          )}
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <AddressForm
          key={`${isNew ? 'new' : (address?.id ?? 'none')}-${formVersion}`}
          address={address}
          isNew={isNew}
          disabled={!isNew && !address}
          onStateChange={setSaveState}
          onCreated={(created) => select(created.id)}
        />
        <DataGrid
          className="min-h-0 flex-1"
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => String(row.id)}
          rowClass={(row, index) => (row.is_active ? (index % 2 ? 'bg-bb-row' : 'bg-white') : 'bg-bb-grey text-gray-400')}
          selectedKey={currentId ? String(currentId) : null}
          onSelect={(row) => {
            select(row.id)
            setSaveState('idle')
          }}
          query={query}
          onQueryChange={(next) => setQuery({ ...next, page: 1 })}
          emptyText={list.isLoading ? 'Chargement…' : 'Aucune adresse. Cliquez sur « Nouvelle adresse ».'}
        />
        <GridPager meta={list.data?.meta} onPage={(page) => setQuery({ ...query, page })} loading={list.isFetching} />
      </div>
    </Workspace>
  )
}

interface AddressFormProps {
  address: Address | null
  isNew: boolean
  disabled: boolean
  onStateChange: (state: SaveState) => void
  onCreated: (address: Address) => void
}

function AddressForm({ address, isNew, disabled, onStateChange, onCreated }: AddressFormProps) {
  const save = useSaveResource<Address, Record<string, unknown>>('addresses')
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(address) })
  const { register, formState } = form
  const errors = formState.errors

  const { submit, onBlur } = useEntityForm(form, {
    isNew,
    onStateChange,
    save: async (values) => {
      const saved = await save.mutateAsync({
        id: address?.id ?? null,
        payload: {
          ...values,
          title: nullable(values.title),
          first_name: nullable(values.first_name),
          designation: nullable(values.designation),
          street: nullable(values.street),
          street_no: nullable(values.street_no),
          zip: nullable(values.zip),
          city: nullable(values.city),
          phone: nullable(values.phone),
          mobile: nullable(values.mobile),
          email: nullable(values.email),
          debtor_no: nullable(values.debtor_no),
          remark: nullable(values.remark),
        },
      })
      if (!address) {
        toast('Adresse créée.', 'success')
        onCreated(saved)
      }
    },
  })

  return (
    <form id={FORM_ID} onSubmit={submit} onBlur={onBlur} className="shrink-0 border-b border-gray-200 px-4 pb-5 pt-4">
      <SectionTitle>{isNew ? 'Nouvelle adresse' : 'Adresse'}</SectionTitle>
      <fieldset disabled={disabled} className="grid grid-cols-[max-content_max-content_max-content] gap-x-12 gap-y-2">
        <Field label="Type">
          <BbSelect className="w-64" {...register('type')}>
            {ADDRESS_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </BbSelect>
        </Field>
        <Field label="Téléphone" labelWidth={80}>
          <BbInput className="w-56" {...register('phone')} />
        </Field>
        <Field label="Actif" labelWidth={90}>
          <BbCheckbox {...register('is_active')} />
        </Field>

        <Field label="Titre">
          <BbInput className="w-64" list="address-titles" {...register('title')} />
          <datalist id="address-titles">
            <option value="Madame" />
            <option value="Monsieur" />
            <option value="Entreprise" />
            <option value="Famille" />
          </datalist>
        </Field>
        <Field label="Mobile" labelWidth={80}>
          <BbInput className="w-56" {...register('mobile')} />
        </Field>
        <Field label="N° débiteur" labelWidth={90}>
          <BbInput className="w-40" {...register('debtor_no')} />
        </Field>

        <Field label="Nom / raison sociale">
          <BbInput className="w-64" autoFocus={isNew} invalid={Boolean(errors.last_name)} title={errors.last_name?.message} {...register('last_name')} />
        </Field>
        <Field label="eMail" labelWidth={80}>
          <BbInput className="w-56" invalid={Boolean(errors.email)} title={errors.email?.message} {...register('email')} />
        </Field>
        <div className="row-span-3 flex items-start gap-2">
          <span className="w-[90px] shrink-0 pt-1.5 text-[13px] text-gray-500">Remarque</span>
          <BbTextarea rows={4} className="w-64" {...register('remark')} />
        </div>

        <Field label="Prénom">
          <BbInput className="w-64" {...register('first_name')} />
        </Field>
        <Field label="Désignation" labelWidth={80}>
          <BbInput className="w-56" {...register('designation')} />
        </Field>

        <Field label="Rue">
          <BbInput className="w-44" {...register('street')} />
          <span className="ml-2 text-gray-500">N°</span>
          <BbInput className="w-14" {...register('street_no')} />
        </Field>
        <Field label="NPA / Lieu" labelWidth={80}>
          <BbInput className="w-16" {...register('zip')} />
          <BbInput className="w-[152px]" {...register('city')} />
        </Field>
      </fieldset>
      {(errors.last_name || errors.email) && (
        <p className="mt-2 text-[12px] text-red-600">{errors.last_name?.message ?? errors.email?.message}</p>
      )}
    </form>
  )
}
