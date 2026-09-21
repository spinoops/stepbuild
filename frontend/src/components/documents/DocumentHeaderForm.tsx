import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BbInput, BbSelect, BbTextarea, Field, SectionTitle, StatusSelect } from '@/components/baubit/Form'
import { useEntityForm } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import type { DocumentActions } from '@/hooks/useDocuments'
import { useAddressOptions } from '@/hooks/useProjects'
import { PRICE_PATTERN, nullable, toNumber } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { DOCUMENT_STATUSES, DOCUMENT_TYPE_LABELS } from '@/lib/status'
import type { DocumentDetail, DocumentStatus } from '@/types'

export const DOCUMENT_FORM_ID = 'document-header-form'

const STATUS_OPTIONS = (Object.keys(DOCUMENT_STATUSES) as DocumentStatus[]).map((key) => ({
  value: key,
  label: DOCUMENT_STATUSES[key].label,
  rowClass: DOCUMENT_STATUSES[key].rowClass,
}))

const schema = z.object({
  title: z.string().max(255),
  date: z.string().min(1, 'La date est requise.'),
  status: z.enum(['en_cours', 'envoye', 'accepte', 'refuse']),
  address_id: z.string(),
  recipient_title: z.string().max(30),
  recipient_name: z.string().max(255),
  recipient_first_name: z.string().max(255),
  recipient_street: z.string().max(255),
  recipient_street_no: z.string().max(20),
  recipient_zip: z.string().max(10),
  recipient_city: z.string().max(255),
  recipient_email: z.string().email('Email invalide.').or(z.literal('')),
  initials: z.string().max(10),
  vat_rate: z.string().regex(PRICE_PATTERN, 'Taux de TVA invalide.').min(1, 'Le taux de TVA est requis.'),
  discount_percent: z.string().regex(PRICE_PATTERN, 'Rabais invalide.'),
  header_text: z.string().max(10000),
  footer_text: z.string().max(10000),
})

type FormValues = z.infer<typeof schema>

interface Props {
  document: DocumentDetail
  actions: DocumentActions
  onStateChange: (state: SaveState) => void
}

/** En-tête du devis : destinataire (instantané du carnet), date, statut, TVA, rabais, textes. */
export default function DocumentHeaderForm({ document: doc, actions, onStateChange }: Props) {
  const carnet = useAddressOptions()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: doc.title ?? '',
      date: doc.date,
      status: doc.status,
      address_id: doc.address_id ? String(doc.address_id) : '',
      recipient_title: doc.recipient_title ?? '',
      recipient_name: doc.recipient_name ?? '',
      recipient_first_name: doc.recipient_first_name ?? '',
      recipient_street: doc.recipient_street ?? '',
      recipient_street_no: doc.recipient_street_no ?? '',
      recipient_zip: doc.recipient_zip ?? '',
      recipient_city: doc.recipient_city ?? '',
      recipient_email: doc.recipient_email ?? '',
      initials: doc.initials ?? '',
      vat_rate: String(doc.vat_rate),
      discount_percent: doc.discount_percent === null ? '' : String(doc.discount_percent),
      header_text: doc.header_text ?? '',
      footer_text: doc.footer_text ?? '',
    },
  })
  const { register, formState, watch, setValue } = form
  const firstError = Object.values(formState.errors)[0]?.message
  // eslint-disable-next-line react-hooks/incompatible-library -- watch() de react-hook-form, usage voulu
  const status = watch('status')

  const { submit, onBlur } = useEntityForm(form, {
    isNew: false,
    onStateChange,
    save: async (values) => {
      await actions.updateHeader({
        ...values,
        title: nullable(values.title),
        address_id: values.address_id ? Number(values.address_id) : null,
        recipient_title: nullable(values.recipient_title),
        recipient_name: nullable(values.recipient_name),
        recipient_first_name: nullable(values.recipient_first_name),
        recipient_street: nullable(values.recipient_street),
        recipient_street_no: nullable(values.recipient_street_no),
        recipient_zip: nullable(values.recipient_zip),
        recipient_city: nullable(values.recipient_city),
        recipient_email: nullable(values.recipient_email),
        initials: nullable(values.initials),
        vat_rate: toNumber(values.vat_rate) ?? 0,
        discount_percent: toNumber(values.discount_percent),
        header_text: nullable(values.header_text),
        footer_text: nullable(values.footer_text),
      })
    },
  })

  /** Choisir une adresse du carnet recopie ses coordonnées dans le devis (instantané modifiable). */
  function pick(value: string) {
    const source = carnet.data?.find((item) => String(item.id) === value)
    if (!source) {
      return
    }
    const options = { shouldDirty: true }
    setValue('recipient_title', source.title ?? '', options)
    setValue('recipient_name', source.last_name, options)
    setValue('recipient_first_name', source.first_name ?? '', options)
    setValue('recipient_street', source.street ?? '', options)
    setValue('recipient_street_no', source.street_no ?? '', options)
    setValue('recipient_zip', source.zip ?? '', options)
    setValue('recipient_city', source.city ?? '', options)
    setValue('recipient_email', source.email ?? '', options)
  }

  const addressField = register('address_id')

  return (
    <form id={DOCUMENT_FORM_ID} onSubmit={submit} onBlur={onBlur} className="min-h-0 flex-1 overflow-auto p-5">
      <div className="flex flex-wrap gap-x-14 gap-y-6">
        <div className="w-[440px] space-y-2">
          <SectionTitle>Informations du document</SectionTitle>
          <Field label="Type">
            <BbInput value={DOCUMENT_TYPE_LABELS[doc.type]} readOnly className="w-72" />
          </Field>
          <Field label="N° de document">
            <BbInput value={doc.number} readOnly className="w-72" />
          </Field>
          <Field label="Objet">
            <BbInput className="w-72" placeholder="ex. Rénovation salle de bain" {...register('title')} />
          </Field>
          <Field label="Date">
            <BbInput type="date" className="w-40" {...register('date')} />
            <span className="ml-3 text-gray-500">Initiales</span>
            <BbInput className="w-16" {...register('initials')} />
          </Field>
          <Field label="Statut">
            <StatusSelect
              options={STATUS_OPTIONS}
              value={status}
              onChange={(value) => setValue('status', value as DocumentStatus, { shouldDirty: true, shouldTouch: true })}
              className="w-72"
            />
          </Field>
          <div className="h-2" />
          <Field label="TVA %">
            <BbInput className="w-20 text-right" {...register('vat_rate')} />
            <span className="ml-3 text-gray-500">Rabais %</span>
            <BbInput className="w-20 text-right" {...register('discount_percent')} />
          </Field>
          <Field label="Total net CHF">
            <BbInput value={fmtAmount(doc.total_net - doc.discount_amount)} readOnly className="w-40 text-right" />
          </Field>
          <Field label="Total TTC CHF">
            <BbInput value={fmtAmount(doc.total_gross)} readOnly className="w-40 text-right font-semibold" />
          </Field>
        </div>

        <div className="w-[440px] space-y-2">
          <SectionTitle>Destinataire</SectionTitle>
          <Field label="Depuis le carnet">
            <BbSelect
              className="w-72"
              {...addressField}
              onChange={(event) => {
                void addressField.onChange(event)
                pick(event.target.value)
              }}
            >
              <option value="">— saisie libre —</option>
              {(carnet.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.last_name} {item.first_name}
                  {item.city ? `, ${item.city}` : ''}
                </option>
              ))}
            </BbSelect>
          </Field>
          <Field label="Titre">
            <BbInput className="w-32" {...register('recipient_title')} />
          </Field>
          <Field label="Nom">
            <BbInput className="w-72" {...register('recipient_name')} />
          </Field>
          <Field label="Prénom">
            <BbInput className="w-72" {...register('recipient_first_name')} />
          </Field>
          <Field label="Rue / N°">
            <BbInput className="w-56" {...register('recipient_street')} />
            <BbInput className="w-14" {...register('recipient_street_no')} />
          </Field>
          <Field label="NPA / Lieu">
            <BbInput className="w-20" {...register('recipient_zip')} />
            <BbInput className="w-[200px]" {...register('recipient_city')} />
          </Field>
          <Field label="eMail">
            <BbInput className="w-72" {...register('recipient_email')} />
          </Field>
        </div>

        <div className="w-[560px] space-y-2">
          <SectionTitle>Textes du document</SectionTitle>
          <div>
            <div className="mb-1 text-[13px] text-gray-500">Texte d'introduction</div>
            <BbTextarea rows={4} className="w-full" placeholder="Madame, Monsieur, suite à notre visite…" {...register('header_text')} />
          </div>
          <div>
            <div className="mb-1 text-[13px] text-gray-500">Conditions et remarques finales</div>
            <BbTextarea rows={5} className="w-full" placeholder="Validité de l'offre, conditions de paiement, délais…" {...register('footer_text')} />
          </div>
        </div>
      </div>
      {firstError && <p className="mt-3 text-[12px] text-red-600">{firstError}</p>}
    </form>
  )
}
