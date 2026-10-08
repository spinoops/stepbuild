import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BbCheckbox, BbInput, BbSelect, BbTextarea, Field, StatusSelect } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import { useEntityForm } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import type { DailyReportActions } from '@/hooks/useDailyReports'
import { nullable } from '@/lib/crud'
import { fmtDate } from '@/lib/format'
import { REPORT_STATUSES } from '@/lib/status'
import type { Collaborator, DailyReport, DocumentDetail, ReportStatus } from '@/types'

export const REPORT_FORM_ID = 'daily-report-form'

const WEATHER_OPTIONS = ['Ensoleillé', 'Partiellement nuageux', 'Couvert', 'Pluie, couvert', 'Orage', 'Neige', 'Brouillard']

const schema = z.object({
  date: z.string().min(1, 'La date est requise.'),
  document_id: z.string(),
  status: z.enum(['en_cours', 'en_controle', 'facture']),
  is_regie: z.boolean(),
  responsible_id: z.string(),
  remark: z.string().max(5000),
  weather: z.string().max(60),
  temp_min: z.string().regex(/^-?\d{0,2}$/, 'Température invalide.'),
  temp_max: z.string().regex(/^-?\d{0,2}$/, 'Température invalide.'),
})

type FormValues = z.infer<typeof schema>

function toValues(report: DailyReport): FormValues {
  return {
    date: report.date,
    document_id: report.document_id ? String(report.document_id) : '',
    status: report.status,
    is_regie: report.is_regie,
    responsible_id: report.responsible_id ? String(report.responsible_id) : '',
    remark: report.remark ?? '',
    weather: report.weather ?? '',
    temp_min: report.temp_min === null ? '' : String(report.temp_min),
    temp_max: report.temp_max === null ? '' : String(report.temp_max),
  }
}

interface ReportHeaderFormProps {
  report: DailyReport
  actions: DailyReportActions
  collaborators: Collaborator[]
  /** Devis du projet (gestion seulement) pour changer le rattachement. */
  documents: DocumentDetail[]
  showPrices: boolean
  onStateChange: (state: SaveState) => void
}

/** En-tête du rapport : numéro, date, remarque, météo, responsable, statut. Sauvegarde automatique. */
export default function ReportHeaderForm({ report, actions, collaborators, documents, showPrices, onStateChange }: ReportHeaderFormProps) {
  const readOnly = !report.can_edit
  // La gestion change toujours le statut (retour en arrière) ; l'ouvrier seulement tant que le rapport est en cours.
  const canChangeStatus = showPrices || report.can_edit
  const statusOptions = (Object.keys(REPORT_STATUSES) as ReportStatus[])
    .filter((key) => showPrices || key !== 'facture')
    .map((key) => ({ value: key, label: `${REPORT_STATUSES[key].code} · ${REPORT_STATUSES[key].label}`, rowClass: REPORT_STATUSES[key].rowClass }))

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(report) })
  const { register, formState, watch, setValue, getValues } = form
  const errors = formState.errors

  const { submit, onBlur } = useEntityForm(form, {
    isNew: false,
    onStateChange,
    save: async (values) => {
      const locked = !report.can_edit
      await actions.updateHeader(
        locked
          ? { status: values.status }
          : {
              date: values.date,
              ...(showPrices ? { document_id: values.document_id ? Number(values.document_id) : null } : {}),
              status: values.status,
              is_regie: values.is_regie,
              responsible_id: values.responsible_id ? Number(values.responsible_id) : null,
              remark: nullable(values.remark),
              weather: nullable(values.weather),
              temp_min: values.temp_min === '' ? null : Number(values.temp_min),
              temp_max: values.temp_max === '' ? null : Number(values.temp_max),
            },
      )
    },
  })

  function shiftDate(days: number) {
    const current = new Date(`${getValues('date')}T00:00:00`)
    current.setDate(current.getDate() + days)
    setValue('date', current.toISOString().slice(0, 10), { shouldDirty: true })
    void submit()
  }

  const inputClass = 'disabled:border-transparent disabled:bg-transparent disabled:text-gray-700'

  return (
    <form id={REPORT_FORM_ID} onSubmit={submit} onBlur={onBlur} className="shrink-0 space-y-2 px-4 pb-4 pt-3">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-2">
        <Field label="Numéro" labelWidth={80}>
          <BbInput value={report.number} readOnly className="w-24" />
          <span className="text-[12px] text-gray-400">{report.project ? `${report.project.number} · ${report.project.designation1}` : ''}</span>
        </Field>
        <Field label="Date" labelWidth={60}>
          <BbInput type="date" {...register('date')} disabled={readOnly} invalid={Boolean(errors.date)} className={`w-40 ${inputClass}`} />
          <span className="w-8 text-[12px] text-gray-500">{watch('date') ? fmtDate(watch('date'), true).slice(-2) : ''}</span>
          {!readOnly && (
            <>
              <button type="button" onClick={() => shiftDate(-1)} className="rounded-md px-1.5 text-gray-400 hover:bg-gray-100" title="Jour précédent">
                ‹
              </button>
              <button type="button" onClick={() => shiftDate(1)} className="rounded-md px-1.5 text-gray-400 hover:bg-gray-100" title="Jour suivant">
                ›
              </button>
            </>
          )}
        </Field>
        {showPrices && (
          <Field label="Devis" labelWidth={50}>
            {/* Remonté quand les devis arrivent : le select reprend alors la valeur du formulaire. */}
            <BbSelect key={documents.length ? 'loaded' : 'loading'} {...register('document_id')} disabled={readOnly} className={`w-64 ${inputClass}`} title="Devis dont les étapes servent à la saisie des heures">
              <option value="">— aucun devis —</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.number}
                  {document.status === 'accepte' ? ' · accepté' : ''}
                </option>
              ))}
            </BbSelect>
          </Field>
        )}
      </div>

      <div className="flex items-start gap-6">
        <div className="flex flex-1 items-start gap-2">
          <span className="w-[80px] shrink-0 pt-1.5 text-[13px] text-gray-500">Remarque</span>
          <BbTextarea {...register('remark')} rows={4} disabled={readOnly} placeholder="Travaux effectués…" className={`w-full max-w-[640px] ${inputClass}`} />
        </div>
        <div className="space-y-2">
          <Field label="Météo" labelWidth={90}>
            <BbSelect {...register('weather')} disabled={readOnly} className={`w-48 ${inputClass}`}>
              <option value="">—</option>
              {WEATHER_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </BbSelect>
            <BbInput {...register('temp_min')} disabled={readOnly} placeholder="min" invalid={Boolean(errors.temp_min)} className={`w-14 text-right ${inputClass}`} title="Température minimale" />
            <BbInput {...register('temp_max')} disabled={readOnly} placeholder="max" invalid={Boolean(errors.temp_max)} className={`w-14 text-right ${inputClass}`} title="Température maximale" />
            <Icon name="sun" className="h-4 w-4 text-amber-500" />
          </Field>
          <Field label="Responsable" labelWidth={90}>
            <BbSelect key={collaborators.length ? 'loaded' : 'loading'} {...register('responsible_id')} disabled={readOnly} className={`w-48 ${inputClass}`}>
              <option value="">—</option>
              {collaborators.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </BbSelect>
            <BbCheckbox label="Régie" {...register('is_regie')} disabled={readOnly} title="Rapport facturable en régie" />
          </Field>
          <Field label="Statut" labelWidth={90}>
            {canChangeStatus ? (
              <StatusSelect options={statusOptions} value={watch('status')} onChange={(value) => setValue('status', value as ReportStatus, { shouldDirty: true })} className="w-64" />
            ) : (
              <span className={`inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium ${REPORT_STATUSES[report.status].rowClass}`}>
                {REPORT_STATUSES[report.status].code} · {REPORT_STATUSES[report.status].label}
              </span>
            )}
          </Field>
        </div>
      </div>
      {readOnly && (
        <p className="text-[12px] text-gray-400">
          {report.status === 'facture' ? 'Rapport facturé : verrouillé.' : showPrices ? 'Rapport verrouillé.' : 'Rapport en contrôle : seule la gestion peut encore le modifier.'}
        </p>
      )}
    </form>
  )
}
