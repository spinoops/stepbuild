import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { BbInput, BbSelect } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import { PRICE_PATTERN, toNumber } from '@/lib/crud'
import { fmtAmount, fmtDate } from '@/lib/format'
import { DOCUMENT_STATUSES } from '@/lib/status'
import type { DocumentDetail } from '@/types'

export type DerivedType = 'acompte' | 'travaux'

export interface DerivedDocumentInput {
  type: DerivedType
  sourceDocumentId: number
  advancePercent?: number | null
  advanceAmount?: number | null
}

interface DerivedDocumentDialogProps {
  type: DerivedType | null
  /** Documents du projet : les devis sont proposés comme source. */
  documents: DocumentDetail[]
  busy?: boolean
  onClose: () => void
  onCreate: (input: DerivedDocumentInput) => void
}

const PERCENTS = [20, 30, 40, 50, 70, 100]

/**
 * Création d'un document dérivé d'un devis : demande d'acompte (pourcentage du net ou montant fixe)
 * ou travaux exécutés (copie des positions, quantités exécutées à corriger). Le devis accepté est
 * proposé d'office, sinon le plus récent.
 */
export default function DerivedDocumentDialog({ type, documents, busy = false, onClose, onCreate }: DerivedDocumentDialogProps) {
  const quotes = documents.filter((item) => item.type === 'devis')
  const preferred = quotes.find((item) => item.status === 'accepte') ?? quotes[quotes.length - 1] ?? null
  const [sourceId, setSourceId] = useState<string>('')
  const [mode, setMode] = useState<'percent' | 'amount'>('percent')
  const [percent, setPercent] = useState('30')
  const [amount, setAmount] = useState('')

  if (!type) {
    return null
  }
  const kind: DerivedType = type
  const source = quotes.find((item) => String(item.id) === (sourceId || String(preferred?.id ?? ''))) ?? null
  const net = source ? source.total_net - source.discount_amount : 0
  const percentValue = toNumber(percent)
  const amountValue = toNumber(amount)
  const preview = mode === 'percent' ? (percentValue !== null ? Math.round((net * percentValue) / 100 * 20) / 20 : null) : amountValue !== null ? Math.round(amountValue * 20) / 20 : null
  const valid =
    source !== null &&
    (type === 'travaux' ||
      (mode === 'percent' ? percentValue !== null && percentValue > 0 && percentValue <= 100 : PRICE_PATTERN.test(amount) && amountValue !== null && amountValue > 0))
  const isAdvance = type === 'acompte'

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid || !source || busy) {
      return
    }
    onCreate({
      type: kind,
      sourceDocumentId: source.id,
      ...(isAdvance ? (mode === 'percent' ? { advancePercent: percentValue } : { advanceAmount: amountValue }) : {}),
    })
  }

  return (
    <Modal open onClose={onClose} title={isAdvance ? "Nouvelle demande d'acompte" : 'Nouveau document « Travaux exécutés »'}>
      <form onSubmit={submit} className="bb">
        <p className="text-[13px] text-gray-500">
          {isAdvance
            ? "L'acompte se calcule sur le net HT du devis. Vous pourrez ensuite corriger la ligne et les textes comme sur un devis."
            : 'Les étapes et positions du devis sont reprises avec leur quantité. Corrigez ensuite les quantités réellement exécutées : le document compare le devis et le réalisé.'}
        </p>

        {quotes.length === 0 ? (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[13px] text-amber-800">Ce projet n'a pas encore de devis : créez-le d'abord.</p>
        ) : (
          <>
            <label className="mt-4 block text-[12px] font-medium text-gray-600">
              Devis de référence
              <BbSelect value={sourceId || String(preferred?.id ?? '')} onChange={(e) => setSourceId(e.target.value)} className="mt-1 w-full">
                {quotes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.number} · {DOCUMENT_STATUSES[item.status].label} · {fmtDate(item.date)} · net {fmtAmount(item.total_net - item.discount_amount)} CHF
                  </option>
                ))}
              </BbSelect>
            </label>

            {isAdvance && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex gap-4 text-[13px]">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={mode === 'percent'} onChange={() => setMode('percent')} className="accent-primary-600" />
                    Pourcentage du devis
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={mode === 'amount'} onChange={() => setMode('amount')} className="accent-primary-600" />
                    Montant fixe
                  </label>
                </div>
                {mode === 'percent' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {PERCENTS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPercent(String(value))}
                        className={`h-8 rounded-full px-3 text-[13px] transition ${
                          percentValue === value ? 'bg-anthracite-800 font-medium text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {value} %
                      </button>
                    ))}
                    <BbInput value={percent} onChange={(e) => setPercent(e.target.value)} inputMode="decimal" className="w-20 text-right" aria-label="Pourcentage" />
                    <span className="text-[13px] text-gray-500">%</span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2">
                    <BbInput autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="5'000.00" className={`w-36 text-right ${PRICE_PATTERN.test(amount) ? '' : 'border-red-400'}`} aria-label="Montant" />
                    <span className="text-[13px] text-gray-500">CHF net HT</span>
                  </div>
                )}
                <div className="mt-3 flex items-baseline justify-between text-[13px]">
                  <span className="text-gray-600">Montant de la demande, net HT</span>
                  <span className="text-[16px] font-semibold tabular-nums text-primary-800">{preview !== null && source ? `${fmtAmount(preview)} CHF` : '—'}</span>
                </div>
                {source && <p className="mt-1 text-[11px] text-gray-400">Devis net HT : {fmtAmount(net)} CHF. La TVA s'ajoute sur le document.</p>}
              </div>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          <button type="submit" disabled={!valid || busy} className="flex h-8 items-center gap-1.5 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40">
            <Icon name="fileplus" className="h-4 w-4" />
            {isAdvance ? "Créer la demande d'acompte" : 'Créer le document'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
