import { useState } from 'react'
import { BbInput, BbSelect, BbTextarea, Field } from '@/components/baubit/Form'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useSaveAbsence } from '@/hooks/useHoursControl'
import { toNumber } from '@/lib/crud'
import { toast } from '@/lib/toast'
import type { AbsenceType, CollaboratorAbsence } from '@/types'

export interface AbsenceDialogState {
  collaboratorId: number
  collaboratorName: string
  from: string
  to?: string
  /** Absence existante le jour choisi (pré-remplit le formulaire et permet d'effacer). */
  existing?: CollaboratorAbsence | null
}

interface AbsenceDialogProps {
  state: AbsenceDialogState | null
  types: Record<AbsenceType, string>
  dayHours: number
  onClose: () => void
}

/**
 * Saisie d'une absence (vacances, maladie, férié…) sur un jour ou une période : sur une période,
 * seuls les jours ouvrés sont pris. 0 heure efface l'absence.
 */
export default function AbsenceDialog({ state, types, dayHours, onClose }: AbsenceDialogProps) {
  return state ? <AbsenceForm key={`${state.collaboratorId}-${state.from}`} state={state} types={types} dayHours={dayHours} onClose={onClose} /> : null
}

function AbsenceForm({ state, types, dayHours, onClose }: AbsenceDialogProps & { state: AbsenceDialogState }) {
  const save = useSaveAbsence()
  const [from, setFrom] = useState(state.from)
  const [to, setTo] = useState(state.to ?? state.from)
  const [type, setType] = useState<AbsenceType>(state.existing?.type ?? 'vacances')
  const [hours, setHours] = useState(String(state.existing?.hours ?? dayHours))
  const [note, setNote] = useState(state.existing?.note ?? '')

  function submit(clear = false) {
    const value = clear ? 0 : toNumber(hours)
    if (!from || (value !== null && (value < 0 || value > 24))) {
      toast('Indiquez une date et un nombre d’heures valide.', 'error')
      return
    }
    save.mutate(
      { collaboratorId: state.collaboratorId, payload: { from, to: to && to !== from ? to : undefined, type, hours: value, note: note.trim() || null } },
      {
        onSuccess: (saved) => {
          toast(clear ? 'Absence effacée.' : `${saved} jour${saved > 1 ? 's' : ''} d’absence enregistré${saved > 1 ? 's' : ''}.`, 'success')
          onClose()
        },
        onError: () => toast("L'absence n'a pas pu être enregistrée.", 'error'),
      },
    )
  }

  return (
    <Modal open onClose={onClose} title={`Absence · ${state.collaboratorName}`}>
      <form
        className="bb space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Field label="Du" labelWidth={90}>
          <BbInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" autoFocus />
          <span className="text-[13px] text-gray-500">au</span>
          <BbInput type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </Field>
        <Field label="Type" labelWidth={90}>
          <BbSelect value={type} onChange={(e) => setType(e.target.value as AbsenceType)} className="w-64">
            {(Object.keys(types) as AbsenceType[]).map((key) => (
              <option key={key} value={key}>
                {types[key]}
              </option>
            ))}
          </BbSelect>
        </Field>
        <Field label="Heures / jour" labelWidth={90}>
          <BbInput value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal" className="w-24 text-right" />
          <span className="text-[12px] text-gray-400">journée complète : {dayHours} h · sur une période, seuls les jours ouvrés comptent</span>
        </Field>
        <Field label="Remarque" labelWidth={90}>
          <BbTextarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={255} className="w-full" />
        </Field>
        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
          {state.existing && (
            <Button type="button" variant="secondary" onClick={() => submit(true)} disabled={save.isPending}>
              Effacer l'absence
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </form>
    </Modal>
  )
}
