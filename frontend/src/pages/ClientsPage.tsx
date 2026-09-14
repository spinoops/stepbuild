import { useState } from 'react'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import { BbCheckbox, BbInput, BbSelect, Field, SectionTitle } from '@/components/baubit/Form'
import { DEMO_ADDRESSES } from '@/lib/demo'
import type { AddressType, DemoAddress } from '@/lib/demo'

const TYPES: AddressType[] = ['Client', 'Fournisseur', 'Sous-traitant', 'Contact']

const COLUMNS: GridColumn<DemoAddress>[] = [
  { key: 'type', header: 'Type', value: (a) => a.type, width: 100 },
  { key: 'title', header: 'Titre', value: (a) => a.title, width: 80 },
  { key: 'lastName', header: 'Nom', value: (a) => a.lastName, width: 200 },
  { key: 'firstName', header: 'Prénom', value: (a) => a.firstName, width: 110 },
  { key: 'street', header: 'Rue', value: (a) => a.street, width: 170 },
  { key: 'streetNo', header: 'N°', value: (a) => a.streetNo, width: 40 },
  { key: 'zip', header: 'NPA', value: (a) => a.zip, width: 50 },
  { key: 'city', header: 'Lieu', value: (a) => a.city, width: 110 },
  { key: 'phone', header: 'Téléphone', value: (a) => a.phone, width: 110 },
  { key: 'email', header: 'eMail', value: (a) => a.email, width: 200 },
  { key: 'active', header: 'Actif', value: (a) => a.active, type: 'bool', width: 45 },
]

/** Adresses : carnet centralisé (clients, fournisseurs, sous-traitants, contacts). */
export default function ClientsPage() {
  const [onlyActive, setOnlyActive] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | AddressType>('all')
  const [selectedId, setSelectedId] = useState(DEMO_ADDRESSES[0].id)

  const rows = DEMO_ADDRESSES.filter((item) => (!onlyActive || item.active) && (typeFilter === 'all' || item.type === typeFilter))
  const address = DEMO_ADDRESSES.find((item) => item.id === selectedId) ?? DEMO_ADDRESSES[0]

  return (
    <Workspace
      demo
      entries={rows.length}
      tabLabel={onlyActive ? 'Adresses - Seulement actifs' : 'Adresses'}
      toolbar={
        <>
          <StandardTools />
          <ToolMenu icon="import" label="Import" />
          <ToolMenu icon="export" label="Export" />
          <ToolSep />
          <BbCheckbox
            label="Seulement actifs"
            checked={onlyActive}
            onChange={(event) => setOnlyActive(event.target.checked)}
            className="ml-1"
          />
          <BbSelect
            className="ml-3 w-40"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as 'all' | AddressType)}
          >
            <option value="all">Tous les types</option>
            {TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </BbSelect>
        </>
      }
      aside={
        <AsidePanel nav={[{ icon: 'contacts', label: 'Adresses', active: true }, { icon: 'users', label: 'Personnes de contact' }]}>
          <div className="mt-1 text-[15px] text-gray-800">Fiche</div>
          <div className="mt-2 space-y-0.5 border border-bb-line bg-white p-2 text-[12px]">
            <div className="font-semibold">
              {address.title} {address.lastName} {address.firstName}
            </div>
            <div>
              {address.street} {address.streetNo}
            </div>
            <div>
              {address.zip} {address.city}
            </div>
            {address.phone && <div className="mt-1">{address.phone}</div>}
            {address.email && <div className="text-bb-blue">{address.email}</div>}
          </div>
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <form key={address.id} className="shrink-0 border-b border-bb-line px-3 pb-4 pt-3">
          <SectionTitle>Adresse</SectionTitle>
          <div className="grid grid-cols-[max-content_max-content] gap-x-10 gap-y-1.5">
            <Field label="Type">
              <BbSelect defaultValue={address.type} className="w-64">
                {TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </BbSelect>
            </Field>
            <Field label="Actif" labelWidth={70}>
              <BbCheckbox defaultChecked={address.active} />
            </Field>
            <Field label="Titre">
              <BbSelect defaultValue={address.title} className="w-64">
                <option>Madame</option>
                <option>Monsieur</option>
                <option>Entreprise</option>
              </BbSelect>
            </Field>
            <Field label="Téléphone" labelWidth={70}>
              <BbInput defaultValue={address.phone} className="w-56" />
            </Field>
            <Field label="Nom">
              <BbInput defaultValue={address.lastName} className="w-64" />
            </Field>
            <Field label="Mobile" labelWidth={70}>
              <BbInput className="w-56" />
            </Field>
            <Field label="Prénom">
              <BbInput defaultValue={address.firstName} className="w-64" />
            </Field>
            <Field label="eMail" labelWidth={70}>
              <BbInput defaultValue={address.email} className="w-56" />
            </Field>
            <Field label="Rue">
              <BbInput defaultValue={address.street} className="w-44" />
              <span className="ml-2 text-gray-700">N°</span>
              <BbInput defaultValue={address.streetNo} className="w-14" />
            </Field>
            <Field label="Remarque" labelWidth={70}>
              <BbInput className="w-56" />
            </Field>
            <Field label="NPA / Lieu">
              <BbInput defaultValue={address.zip} className="w-16" />
              <BbInput defaultValue={address.city} className="w-[184px]" />
            </Field>
          </div>
        </form>
        <DataGrid
          className="min-h-0 flex-1"
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => row.id}
          rowClass={(row, index) => (row.active ? (index % 2 ? 'bg-bb-row' : 'bg-white') : 'bg-bb-grey text-gray-500')}
          selectedKey={selectedId}
          onSelect={(row) => setSelectedId(row.id)}
        />
      </div>
    </Workspace>
  )
}
