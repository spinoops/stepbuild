import { Fragment, useState } from 'react'
import ElementPicker from '@/components/shared/ElementPicker'
import { Icon } from '@/components/icons'
import { COST_FAMILIES, round2 } from '@/lib/costFamilies'
import { toNumber } from '@/lib/crud'
import { fmtAmount, fmtDate } from '@/lib/format'
import type { EvaluatedLine, LineDraft } from '@/lib/breakdown'
import { linkedValues, newLine } from '@/lib/breakdown'
import { numberText } from '@/lib/breakdown'

interface BreakdownLinesTableProps {
  evaluated: EvaluatedLine[]
  onUpdateLine: (key: number, patch: Partial<LineDraft>) => void
  onAddLine: (line: LineDraft) => void
  onRemoveLine: (key: number) => void
  readOnly?: boolean
  /** Hauteur maximale de la zone défilante (classe Tailwind). */
  className?: string
}

const CELL =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] outline-none transition hover:border-gray-200 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 disabled:hover:border-transparent'

/**
 * Tableau des lignes d'un sous-détail de prix, par famille (MO, MAT, MACH, MAT EX, OUT, ST) :
 * ressource, quantité (× Qté de la ligne), conditionnement, coût unitaire, majoration, vente. Partagé par la
 * fenêtre du devis et par les sous-détails types. Une ligne **rattachée à un élément de coûts** (pastille avec
 * son numéro) prend son unité et son prix, non modifiables ; l'étiquette au survol d'une ligne libre permet de
 * la rattacher, la pastille de la détacher.
 */
export default function BreakdownLinesTable({ evaluated, onUpdateLine, onAddLine, onRemoveLine, readOnly = false, className = 'max-h-[52vh]' }: BreakdownLinesTableProps) {
  // Ligne dont on choisit l'élément de coûts (champ de recherche ouvert sous la ligne).
  const [linking, setLinking] = useState<number | null>(null)

  function add(family: number, values: Partial<LineDraft>) {
    const line = newLine(family, values)
    onAddLine(line)
    window.setTimeout(() => window.document.querySelector<HTMLInputElement>(`[data-bq="${line.key}"]`)?.select(), 40)
  }

  return (
    <div className={`overflow-auto rounded-lg border border-gray-200 ${className}`}>
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10 bg-bb-ribbon text-[11px] font-semibold text-gray-500">
          <tr>
            <th className="border-b border-gray-200 px-2 py-1.5 text-left">Ressource</th>
            <th className="w-20 border-b border-gray-200 px-1 py-1.5 text-right">Quantité</th>
            <th className="w-14 border-b border-gray-200 px-1 py-1.5 text-left">Un.</th>
            <th className="w-12 border-b border-gray-200 px-1 py-1.5 text-center" title="Quantité par unité de la ligne : multipliée par sa quantité (× Qté)">
              × Qté
            </th>
            <th className="w-16 border-b border-gray-200 px-1 py-1.5 text-right" title="Conditionnement : arrondi au sac, à la pièce entière…">
              Cond.
            </th>
            <th className="w-20 border-b border-gray-200 px-1 py-1.5 text-right">Comptée</th>
            <th className="w-24 border-b border-gray-200 px-1 py-1.5 text-right">Coût unit.</th>
            <th className="w-24 border-b border-gray-200 px-2 py-1.5 text-right">Coût</th>
            <th className="w-16 border-b border-gray-200 px-1 py-1.5 text-right">Maj. %</th>
            <th className="w-24 border-b border-gray-200 px-2 py-1.5 text-right">Vente</th>
            <th className="w-8 border-b border-gray-200" />
          </tr>
        </thead>
        {COST_FAMILIES.map((family) => {
          const rows = evaluated.filter((item) => item.line.family === family.id)
          const subtotal = round2(rows.reduce((sum, item) => sum + item.sale, 0))
          return (
            <tbody key={family.id}>
              <tr className="bg-gray-100">
                <td colSpan={9} className="px-2 py-1 text-[12px] font-semibold uppercase tracking-wide text-gray-700">
                  {family.code}
                  <span className="ml-2 font-normal normal-case tracking-normal text-gray-400">{family.label}</span>
                </td>
                <td className="px-2 py-1 text-right text-[12px] font-semibold tabular-nums text-gray-700">{rows.length > 0 ? fmtAmount(subtotal) : ''}</td>
                <td />
              </tr>
              {rows.map(({ line, counted, cost, sale }) => (
                <Fragment key={line.key}>
                <tr className="group border-b border-gray-100" title={line.note || undefined}>
                  <td className="py-0.5 pl-1">
                    <div className="flex items-center gap-1">
                      {line.element ? (
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => onUpdateLine(line.key, { price_element_id: null, element: null })}
                          title={`Élément de coûts ${line.element.number} · ${line.element.description}\nPrix net ${line.element.net_price !== null ? fmtAmount(line.element.net_price) : '—'}${line.element.regie_price !== null ? `, régie ${fmtAmount(line.element.regie_price)}` : ''}${line.element.price_updated_at ? ` (prix du ${fmtDate(line.element.price_updated_at)})` : ''}\nSon prix s'applique à la ligne. Clic : détacher (le prix redevient libre).`}
                          className="h-5 shrink-0 rounded bg-primary-100 px-1.5 text-[11px] font-medium tabular-nums text-primary-800 hover:bg-primary-200 disabled:hover:bg-primary-100"
                        >
                          {line.element.number}
                        </button>
                      ) : (
                        !readOnly && (
                          <button
                            type="button"
                            onClick={() => setLinking(linking === line.key ? null : line.key)}
                            title="Rattacher à un élément de coûts : son prix s'appliquera à la ligne"
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-300 transition hover:bg-primary-100 hover:text-primary-700 ${linking === line.key ? 'bg-primary-100 text-primary-700' : 'opacity-0 group-hover:opacity-100'}`}
                          >
                            <Icon name="tag" className="h-3.5 w-3.5" />
                          </button>
                        )
                      )}
                      <input value={line.label} onChange={(e) => onUpdateLine(line.key, { label: e.target.value })} disabled={readOnly} placeholder="Libellé" maxLength={255} className={CELL} aria-label="Ressource" />
                    </div>
                  </td>
                  <td className="py-0.5">
                    <input data-bq={line.key} value={line.quantity} onChange={(e) => onUpdateLine(line.key, { quantity: e.target.value })} disabled={readOnly} inputMode="decimal" className={`${CELL} text-right`} aria-label="Quantité" />
                  </td>
                  <td className="py-0.5">
                    <input value={line.unit} onChange={(e) => onUpdateLine(line.key, { unit: e.target.value })} disabled={readOnly || line.element !== null} title={line.element ? "Unité de l'élément de coûts" : undefined} maxLength={20} className={CELL} aria-label="Unité" />
                  </td>
                  <td className="py-0.5 text-center">
                    <input type="checkbox" checked={line.per_dimension} onChange={(e) => onUpdateLine(line.key, { per_dimension: e.target.checked })} disabled={readOnly} title="Quantité par unité de la ligne : × Qté" className="h-4 w-4 accent-primary-600" />
                  </td>
                  <td className="py-0.5">
                    <input value={line.pack_size} onChange={(e) => onUpdateLine(line.key, { pack_size: e.target.value })} disabled={readOnly} inputMode="decimal" placeholder="—" title="Conditionnement (ex. sac de 25 kg, ou 1 pour arrondir à l'unité)" className={`${CELL} text-right`} aria-label="Conditionnement" />
                  </td>
                  <td className="px-1 py-1 text-right tabular-nums text-gray-500">
                    {fmtAmount(counted, counted % 1 === 0 ? 0 : 2)}
                    {line.pack_size && toNumber(line.pack_size) ? <span className="text-gray-400"> × {numberText(toNumber(line.pack_size))}</span> : null}
                  </td>
                  <td className="py-0.5">
                    <input
                      value={line.unit_cost}
                      onChange={(e) => onUpdateLine(line.key, { unit_cost: e.target.value })}
                      disabled={readOnly || line.element !== null}
                      title={line.element ? `Prix de l'élément de coûts ${line.element.number} : suit la liste de prix` : undefined}
                      inputMode="decimal"
                      className={`${CELL} text-right ${line.element ? 'text-primary-700' : ''}`}
                      aria-label="Coût unitaire"
                    />
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmtAmount(cost)}</td>
                  <td className="py-0.5">
                    <input value={line.markup_percent} onChange={(e) => onUpdateLine(line.key, { markup_percent: e.target.value })} disabled={readOnly} inputMode="decimal" className={`${CELL} text-right`} aria-label="Majoration" />
                  </td>
                  <td className="px-2 py-1 text-right font-medium tabular-nums">{fmtAmount(sale)}</td>
                  <td className="py-0.5 pr-1">
                    {!readOnly && (
                      <button type="button" onClick={() => onRemoveLine(line.key)} title="Retirer la ligne" className="rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-focus-within:opacity-100 group-hover:opacity-100">
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
                {linking === line.key && !readOnly && (
                  <tr className="border-b border-gray-100 bg-primary-50/60">
                    <td colSpan={11} className="px-2 py-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-[12px] text-primary-800">Élément de coûts pour « {line.label || 'cette ligne'} » :</span>
                        <div className="min-w-0 flex-1">
                          <ElementPicker
                            family={line.family}
                            placeholder="Tapez les premières lettres de l'élément, puis Entrée"
                            onPick={(element) => {
                              onUpdateLine(line.key, linkedValues(element))
                              setLinking(null)
                            }}
                            onFree={() => setLinking(null)}
                          />
                        </div>
                        <button type="button" onClick={() => setLinking(null)} title="Fermer" className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700">
                          <Icon name="close" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {!readOnly && (
                <tr>
                  <td colSpan={11} className="border-b border-gray-100 px-1 py-0.5">
                    <ElementPicker
                      family={family.id}
                      placeholder={`Ajouter ${family.label.toLowerCase()} : élément de coûts ou libellé, puis Entrée`}
                      onPick={(element) => add(family.id, linkedValues(element))}
                      onFree={(label) => add(family.id, { label })}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
