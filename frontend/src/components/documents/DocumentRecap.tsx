import { fmtAmount } from '@/lib/format'
import type { DocumentDetail } from '@/types'

/** Récapitulation : total par étape, rabais, TVA, arrondi, TTC, et marge sur prix de revient. */
export default function DocumentRecap({ document: doc }: { document: DocumentDetail }) {
  const steps = doc.steps ?? []
  const positions = steps.flatMap((step) => step.positions).filter((position) => !position.is_optional && position.amount !== null)
  // Prix de revient connu : seulement les positions qui ont un prix d'achat.
  const costed = positions.filter((position) => position.cost_price !== null && position.quantity !== null)
  const cost = costed.reduce((sum, position) => sum + (position.quantity ?? 0) * (position.cost_price ?? 0), 0)
  const costedSales = costed.reduce((sum, position) => sum + (position.amount ?? 0), 0)
  const margin = costedSales > 0 ? ((costedSales - cost) / costedSales) * 100 : null
  const options = steps.flatMap((step) => step.positions).filter((position) => position.is_optional && position.amount !== null)
  const base = doc.total_net - doc.discount_amount

  const row = 'border-b border-gray-100 px-3 py-1.5'

  return (
    <div className="flex min-h-0 flex-1 flex-wrap items-start gap-10 overflow-auto p-5">
      <table className="w-[560px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-bb-ribbon text-[12px] font-semibold text-gray-500">
            <th className="border-b border-gray-200 px-3 py-2 text-left">Étape</th>
            <th className="border-b border-gray-200 px-3 py-2 text-right">Montant CHF</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr key={step.id}>
              <td className={row}>
                <span className="mr-2 text-gray-400">{step.code}</span>
                {step.label}
              </td>
              <td className={`${row} text-right tabular-nums`}>{fmtAmount(step.total)}</td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-medium">
            <td className="border-b border-gray-200 px-3 py-1.5">Total des étapes</td>
            <td className="border-b border-gray-200 px-3 py-1.5 text-right tabular-nums">{fmtAmount(doc.total_net)}</td>
          </tr>
          {doc.discount_amount > 0 && (
            <>
              <tr>
                <td className={`${row} text-gray-600`}>Rabais {fmtAmount(doc.discount_percent ?? 0, 1)} %</td>
                <td className={`${row} text-right tabular-nums`}>− {fmtAmount(doc.discount_amount)}</td>
              </tr>
              <tr className="font-medium">
                <td className={row}>Total net HT</td>
                <td className={`${row} text-right tabular-nums`}>{fmtAmount(base)}</td>
              </tr>
            </>
          )}
          <tr>
            <td className={`${row} text-gray-600`}>TVA {fmtAmount(doc.vat_rate, 1)} %</td>
            <td className={`${row} text-right tabular-nums`}>{fmtAmount(doc.total_vat)}</td>
          </tr>
          {doc.rounding !== 0 && (
            <tr>
              <td className={`${row} text-gray-600`}>Arrondi à 5 centimes</td>
              <td className={`${row} text-right tabular-nums`}>{fmtAmount(doc.rounding)}</td>
            </tr>
          )}
          <tr className="bg-primary-50 font-semibold text-primary-800">
            <td className="px-3 py-2">Total TTC</td>
            <td className="px-3 py-2 text-right tabular-nums">{fmtAmount(doc.total_gross)}</td>
          </tr>
        </tbody>
      </table>

      <div className="w-[320px] space-y-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Marge (usage interne)</div>
          {margin === null ? (
            <p className="mt-2 text-[13px] text-gray-400">Aucune position chiffrée avec un prix d'achat.</p>
          ) : (
            <>
              <div className={`mt-2 text-2xl font-semibold ${margin < 30 ? 'text-accent-600' : 'text-green-700'}`}>{fmtAmount(margin, 1)} %</div>
              <dl className="mt-2 space-y-1 text-[13px] text-gray-600">
                <div className="flex justify-between">
                  <dt>Vente concernée</dt>
                  <dd className="tabular-nums">{fmtAmount(costedSales)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Prix de revient</dt>
                  <dd className="tabular-nums">{fmtAmount(cost)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-[11px] text-gray-400">
                Calculée sur les {costed.length} positions qui ont un prix d'achat, sur {positions.length} positions chiffrées.
                {margin < 30 ? ' Sous la marge minimale de 30 %.' : ''}
              </p>
            </>
          )}
        </div>

        {options.length > 0 && (
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Options (hors total)</div>
            <ul className="mt-2 space-y-1 text-[13px] text-gray-600">
              {options.map((position) => (
                <li key={position.id} className="flex justify-between gap-3">
                  <span className="truncate">{position.description}</span>
                  <span className="shrink-0 tabular-nums">{fmtAmount(position.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
