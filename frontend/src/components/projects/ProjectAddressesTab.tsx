import { useState } from 'react'
import { BbInput, BbSelect, Field } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import { useAddressOptions, useDeleteProjectAddress, useSaveProjectAddress } from '@/hooks/useProjects'
import type { ProjectAddressPayload } from '@/hooks/useProjects'
import { toast } from '@/lib/toast'
import type { Project, ProjectAddress } from '@/types'

const LABELS = ['Facturation', 'Architecte', 'Direction des travaux', 'Accès chantier', 'Propriétaire', 'Locataire', 'Voisin']

const EMPTY: ProjectAddressPayload = {
  label: '', address_id: null, name: '', street: '', street_no: '', zip: '', city: '', phone: '', email: '', remark: '',
}

interface Props {
  project: Project
  readOnly: boolean
}

/** Adresses nommées d'un projet : facturation, architecte, accès… liées ou non au carnet. */
export default function ProjectAddressesTab({ project, readOnly }: Props) {
  const [editing, setEditing] = useState<{ id: number | null; values: ProjectAddressPayload } | null>(null)
  const save = useSaveProjectAddress(project.id)
  const remove = useDeleteProjectAddress(project.id)
  const carnet = useAddressOptions(!readOnly)
  const addresses = project.addresses ?? []

  function edit(address: ProjectAddress) {
    setEditing({
      id: address.id,
      values: {
        label: address.label, address_id: address.address_id, name: address.name ?? '', street: address.street ?? '',
        street_no: address.street_no ?? '', zip: address.zip ?? '', city: address.city ?? '',
        phone: address.phone ?? '', email: address.email ?? '', remark: address.remark ?? '',
      },
    })
  }

  function set<K extends keyof ProjectAddressPayload>(key: K, value: ProjectAddressPayload[K]) {
    setEditing((current) => (current ? { ...current, values: { ...current.values, [key]: value } } : current))
  }

  /** Choisir une adresse du carnet recopie ses coordonnées (modifiables ensuite). */
  function pick(id: string) {
    const source = carnet.data?.find((item) => String(item.id) === id)
    setEditing((current) =>
      current
        ? {
            ...current,
            values: source
              ? {
                  ...current.values,
                  address_id: source.id,
                  name: `${source.last_name} ${source.first_name ?? ''}`.trim(),
                  street: source.street ?? '', street_no: source.street_no ?? '', zip: source.zip ?? '',
                  city: source.city ?? '', phone: source.phone ?? '', email: source.email ?? '',
                }
              : { ...current.values, address_id: null },
          }
        : current,
    )
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!editing || !editing.values.label.trim()) {
      return
    }
    const clean = Object.fromEntries(
      Object.entries(editing.values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value]),
    ) as unknown as ProjectAddressPayload
    save.mutate(
      { id: editing.id, payload: { ...clean, label: editing.values.label.trim() } },
      {
        onSuccess: () => {
          toast(editing.id ? 'Adresse mise à jour.' : 'Adresse ajoutée au projet.', 'success')
          setEditing(null)
        },
        onError: () => toast("L'adresse n'a pas pu être enregistrée (email invalide ?).", 'error'),
      },
    )
  }

  return (
    <div className="mt-4 flex h-[300px] gap-6">
      <div className="w-[420px] shrink-0 overflow-auto">
        {addresses.length === 0 && <p className="text-[13px] text-gray-400">Aucune adresse supplémentaire pour ce projet.</p>}
        <ul className="space-y-1.5">
          {addresses.map((address) => (
            <li
              key={address.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                editing?.id === address.id ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <span className="mt-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{address.label}</span>
              <span className="min-w-0 flex-1 text-[13px]">
                <span className="block truncate font-medium text-gray-800">{address.name || '—'}</span>
                <span className="block truncate text-gray-500">
                  {[`${address.street ?? ''} ${address.street_no ?? ''}`.trim(), `${address.zip ?? ''} ${address.city ?? ''}`.trim(), address.phone]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {!readOnly && (
                <span className="flex shrink-0 gap-0.5">
                  <button type="button" onClick={() => edit(address)} title="Modifier" className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                    <Icon name="edit" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Retirer du projet"
                    onClick={() => window.confirm(`Retirer l'adresse « ${address.label} » du projet ?`) && remove.mutate(address.id)}
                    className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {!readOnly && !editing && (
          <button
            type="button"
            onClick={() => setEditing({ id: null, values: EMPTY })}
            className="mt-3 flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-3 text-[13px] text-gray-700 hover:bg-gray-50"
          >
            <Icon name="plus" className="h-4 w-4" />
            Ajouter une adresse
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={onSubmit} className="space-y-2 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Field label="Rôle de l'adresse" labelWidth={110}>
            <BbInput value={editing.values.label} onChange={(e) => set('label', e.target.value)} list="project-address-labels" className="w-56" autoFocus />
            <datalist id="project-address-labels">
              {LABELS.map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
          </Field>
          <Field label="Depuis le carnet" labelWidth={110}>
            <BbSelect value={editing.values.address_id ?? ''} onChange={(e) => pick(e.target.value)} className="w-80">
              <option value="">— saisie libre —</option>
              {(carnet.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.last_name} {item.first_name}
                  {item.city ? `, ${item.city}` : ''}
                </option>
              ))}
            </BbSelect>
          </Field>
          <Field label="Nom" labelWidth={110}>
            <BbInput value={editing.values.name ?? ''} onChange={(e) => set('name', e.target.value)} className="w-80" />
          </Field>
          <Field label="Rue / N°" labelWidth={110}>
            <BbInput value={editing.values.street ?? ''} onChange={(e) => set('street', e.target.value)} className="w-60" />
            <BbInput value={editing.values.street_no ?? ''} onChange={(e) => set('street_no', e.target.value)} className="w-[72px]" />
          </Field>
          <Field label="NPA / Lieu" labelWidth={110}>
            <BbInput value={editing.values.zip ?? ''} onChange={(e) => set('zip', e.target.value)} className="w-20" />
            <BbInput value={editing.values.city ?? ''} onChange={(e) => set('city', e.target.value)} className="w-[232px]" />
          </Field>
          <Field label="Téléphone / eMail" labelWidth={110}>
            <BbInput value={editing.values.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className="w-36" />
            <BbInput value={editing.values.email ?? ''} onChange={(e) => set('email', e.target.value)} className="w-[176px]" />
          </Field>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={save.isPending || !editing.values.label.trim()}
              className="h-8 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40"
            >
              {editing.id ? 'Enregistrer' : 'Ajouter'}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
