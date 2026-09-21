import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BbCheckbox, BbInput, BbSelect, BbTextarea, Field, StatusSelect } from '@/components/baubit/Form'
import { useEntityForm } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import { fetchNextProjectNumber, useAddressOptions } from '@/hooks/useProjects'
import { nullable, useSaveResource } from '@/lib/crud'
import { PROJECT_STATUSES } from '@/lib/status'
import { toast } from '@/lib/toast'
import type { Project, ProjectStatus } from '@/types'

export const PROJECT_FORM_ID = 'project-form'

const STATUS_OPTIONS = (Object.keys(PROJECT_STATUSES) as ProjectStatus[]).map((key) => ({
  value: key,
  label: `${PROJECT_STATUSES[key].code} · ${PROJECT_STATUSES[key].label}`,
  rowClass: PROJECT_STATUSES[key].rowClass,
}))

const schema = z.object({
  number: z.string().trim().min(1, 'Le numéro de projet est requis.').max(30),
  designation1: z.string().trim().min(1, 'La désignation 1 est requise.').max(255),
  designation2: z.string().max(255),
  client_id: z.string(),
  status: z.enum(['en_cours', 'adjuge', 'termine', 'refuse']),
  is_active: z.boolean(),
  is_template: z.boolean(),
  street: z.string().max(255),
  street_no: z.string().max(20),
  zip: z.string().max(10),
  city: z.string().max(255),
  country: z.string().max(5),
  phone: z.string().max(40),
  mobile: z.string().max(40),
  contract_no: z.string().max(60),
  cost_unit: z.string().max(60),
  invoice_instructions: z.string().max(5000),
})

type FormValues = z.infer<typeof schema>

function toValues(project: Project | null): FormValues {
  return {
    number: project?.number ?? '',
    designation1: project?.designation1 ?? '',
    designation2: project?.designation2 ?? '',
    client_id: project?.client_id ? String(project.client_id) : '',
    status: project?.status ?? 'en_cours',
    is_active: project?.is_active ?? true,
    is_template: project?.is_template ?? false,
    street: project?.street ?? '',
    street_no: project?.street_no ?? '',
    zip: project?.zip ?? '',
    city: project?.city ?? '',
    country: project?.country ?? '',
    phone: project?.phone ?? '',
    mobile: project?.mobile ?? '',
    contract_no: project?.contract_no ?? '',
    cost_unit: project?.cost_unit ?? '',
    invoice_instructions: project?.invoice_instructions ?? '',
  }
}

interface ProjectFormProps {
  project: Project | null
  isNew: boolean
  /** Lecture seule (rôle ouvrier ou aucune fiche sélectionnée). */
  readOnly: boolean
  onStateChange: (state: SaveState) => void
  onCreated: (project: Project) => void
}

/** Onglet « Général » de la fiche projet, avec sauvegarde automatique. */
export default function ProjectForm({ project, isNew, readOnly, onStateChange, onCreated }: ProjectFormProps) {
  const save = useSaveResource<Project, Record<string, unknown>>('projects')
  const clients = useAddressOptions(!readOnly)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(project) })
  const { register, formState, watch, setValue, getValues } = form
  const errors = formState.errors
  const firstError = Object.values(errors)[0]?.message
  // eslint-disable-next-line react-hooks/incompatible-library -- watch() de react-hook-form, usage voulu
  const status = watch('status')

  const { submit, onBlur } = useEntityForm(form, {
    isNew,
    onStateChange,
    save: async (values) => {
      const saved = await save.mutateAsync({
        id: project?.id ?? null,
        payload: {
          ...values,
          number: values.number.trim(),
          designation1: values.designation1.trim(),
          client_id: values.client_id ? Number(values.client_id) : null,
          designation2: nullable(values.designation2),
          street: nullable(values.street),
          street_no: nullable(values.street_no),
          zip: nullable(values.zip),
          city: nullable(values.city),
          country: nullable(values.country),
          phone: nullable(values.phone),
          mobile: nullable(values.mobile),
          contract_no: nullable(values.contract_no),
          cost_unit: nullable(values.cost_unit),
          invoice_instructions: nullable(values.invoice_instructions),
        },
      })
      if (!project) {
        toast(`Projet ${saved.number} créé.`, 'success')
        onCreated(saved)
      }
    },
  })

  /** Propose le prochain numéro pour le NPA du chantier (habitude BauBit : 2853-055). */
  async function suggestNumber(force: boolean) {
    const zip = getValues('zip').trim()
    if (!zip || (!force && getValues('number').trim())) {
      return
    }
    try {
      setValue('number', await fetchNextProjectNumber(zip), { shouldDirty: true, shouldValidate: true })
    } catch {
      // NPA non exploitable : l'utilisateur saisit le numéro à la main.
    }
  }

  /** Nouveau projet : le client choisi pré-remplit la désignation et l'adresse du chantier. */
  function onClientChange(value: string) {
    const client = clients.data?.find((item) => String(item.id) === value)
    if (!isNew || !client) {
      return
    }
    const name = `${client.last_name} ${client.first_name ?? ''}`.trim()
    if (!getValues('designation1').trim()) {
      setValue('designation1', `${name} - `, { shouldDirty: true })
    }
    if (!getValues('street').trim() && !getValues('zip').trim()) {
      setValue('street', client.street ?? '')
      setValue('street_no', client.street_no ?? '')
      setValue('zip', client.zip ?? '')
      setValue('city', client.city ?? '')
      void suggestNumber(false)
    }
  }

  const clientField = register('client_id')
  const zipField = register('zip')

  return (
    <form id={PROJECT_FORM_ID} onSubmit={submit} onBlur={onBlur} className="mt-4">
      <fieldset disabled={readOnly} className="grid grid-cols-[max-content_max-content] gap-x-12 gap-y-2">
        <Field label="N° de projet">
          <BbInput className="w-44" invalid={Boolean(errors.number)} {...register('number')} />
          {!readOnly && (
            <button
              type="button"
              onClick={() => void suggestNumber(true)}
              title="Proposer le prochain numéro pour le NPA du chantier"
              className="h-8 rounded-md border border-gray-200 px-2 text-[12px] text-gray-600 hover:bg-gray-50"
            >
              Proposer
            </button>
          )}
        </Field>
        <div className="flex items-center gap-8">
          <BbCheckbox label="Actif" {...register('is_active')} />
          <BbCheckbox label="Modèle de projet" {...register('is_template')} />
        </div>

        <Field label="Client" className="col-span-2">
          <BbSelect
            className="w-[560px]"
            {...clientField}
            onChange={(event) => {
              void clientField.onChange(event)
              onClientChange(event.target.value)
            }}
          >
            <option value="">— aucun client —</option>
            {project?.client && !clients.data?.some((item) => item.id === project.client?.id) && (
              <option value={project.client.id}>{project.client.label}</option>
            )}
            {(clients.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.last_name} {item.first_name}
                {item.city ? `, ${item.city}` : ''}
              </option>
            ))}
          </BbSelect>
        </Field>
        <Field label="Désignation 1" className="col-span-2">
          <BbInput
            className="w-[560px]"
            autoFocus={isNew}
            placeholder="Nom client - Travaux à réaliser (ex. Rénovation salle de bain)"
            invalid={Boolean(errors.designation1)}
            {...register('designation1')}
          />
        </Field>
        <Field label="Désignation 2" className="col-span-2">
          <BbInput className="w-[560px]" {...register('designation2')} />
        </Field>

        <Field label="Rue du chantier">
          <BbInput className="w-44" {...register('street')} />
          <span className="ml-2 text-gray-500">N°</span>
          <BbInput className="w-14" {...register('street_no')} />
        </Field>
        <Field label="Téléphone" labelWidth={90}>
          <BbInput className="w-48" {...register('phone')} />
        </Field>

        <Field label="NPA / Lieu">
          <BbInput
            className="w-20"
            {...zipField}
            onBlur={(event) => {
              void zipField.onBlur(event)
              if (isNew) {
                void suggestNumber(false)
              }
            }}
          />
          <BbInput className="w-[172px]" {...register('city')} />
        </Field>
        <Field label="Mobile" labelWidth={90}>
          <BbInput className="w-48" {...register('mobile')} />
        </Field>

        <Field label="N° contrat">
          <BbInput className="w-64" {...register('contract_no')} />
        </Field>
        <Field label="Unité d'imput." labelWidth={90}>
          <BbInput className="w-48" {...register('cost_unit')} />
        </Field>

        <Field label="Statut">
          <StatusSelect
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) => setValue('status', value as ProjectStatus, { shouldDirty: true, shouldTouch: true })}
            className="w-64"
          />
        </Field>
        <div className="row-span-2 flex items-start gap-2">
          <span className="w-[90px] shrink-0 pt-1.5 text-[13px] text-gray-500">Instructions facture</span>
          <BbTextarea rows={2} className="w-72" {...register('invoice_instructions')} />
        </div>
      </fieldset>
      {firstError && <p className="mt-2 text-[12px] text-red-600">{firstError}</p>}
    </form>
  )
}
