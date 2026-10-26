import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toNumber } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import { computedQuantity, costFamily } from '@/lib/costFamilies'
import type { DocumentActions, PositionPayload } from '@/hooks/useDocuments'
import type { DocumentPosition } from '@/types'
import { Icon } from '@/components/icons'
import UnitSelect from '@/components/shared/UnitSelect'
import { InsertAboveButton } from '@/components/documents/InsertLineRow'

interface Draft {
  code: string
  description: string
  unit: string
  quantity: string
  unit_price: string
  is_optional: boolean
}

/** Nombre affiché comme sur le document (3.00, 95.00) ; les décimales supplémentaires sont conservées (0.125). */
const text = (value: number | null) => (value === null ? '' : Number.isInteger(Math.round(value * 1e6) / 1e4) ? value.toFixed(2) : String(value))

/** Quantité du sous-détail : 2, 2.5, 37.8. */
const qty = (value: number) => String(Math.round(value * 1000) / 1000)

function toDraft(position: DocumentPosition): Draft {
  return {
    code: position.code ?? '',
    description: position.description,
    unit: position.unit ?? '',
    quantity: text(position.quantity),
    unit_price: text(position.unit_price),
    is_optional: position.is_optional,
  }
}

const CELL =
  'w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[14px] outline-none transition hover:border-gray-200 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100'

export type DropPlace = 'above' | 'below'

/** Entoure un champ de parenthèses (prix d'une option : affiché, mais hors total). */
function Parens({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) {
    return children
  }
  return (
    <span className="flex items-center text-gray-400" title="Option : hors total">
      <span className="pl-1">(</span>
      <span className="min-w-0 flex-1">{children}</span>
      <span className="pr-0.5">)</span>
    </span>
  )
}

interface PositionRowProps {
  position: DocumentPosition
  /** Numéro tel qu'il sera imprimé (5.1, 6.1.1…) ; vide pour un texte. */
  printNumber: string
  actions: DocumentActions
  onSaving: (saving: boolean) => void
  /** Déplacement au clavier depuis la poignée (flèches haut / bas). */
  onMove: (direction: -1 | 1) => void
  /** Glisser-déposer : la ligne saisie par sa poignée, et la ligne survolée. */
  dragging: boolean
  dropPlace: DropPlace | null
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (place: DropPlace) => void
  onDrop: (place: DropPlace) => void
  /** Ouvre le sous-détail de prix (coûts par famille → prix calculé). */
  onOpenBreakdown: () => void
  /** Options d'affichage du devis : sous-détail en rouge sous la ligne, prix masqués. */
  showBreakdown?: boolean
  hidePrices?: boolean
  /** Travaux exécutés : affiche la quantité du devis à côté de la quantité exécutée. */
  showQuoted?: boolean
  /** « + » au-dessus de la ligne : insérer un titre de chapitre, un sous-titre ou un texte à cet endroit. */
  onInsertAbove?: () => void
}

/**
 * Ligne de devis éditable en place, présentée comme sur le document imprimé (numéro, description,
 * unité, quantité, prix, montant). Le brouillon local fait foi pendant la saisie ; il est envoyé à la
 * sortie de la ligne ou 1,5 s après la dernière frappe. Entrée : quantité → prix → champ d'ajout.
 * Les outils qui n'existent pas sur le papier sont dans les marges : poignée à gauche (souris, ou
 * flèches haut et bas au clavier), option, sous-détail et suppression à droite.
 * Une ligne avec sous-détail reçoit son prix du serveur (total du sous-détail ÷ quantité) et le suit quand
 * la quantité change ; le prix unitaire reste corrigeable à la main, et le montant aussi : un total saisi
 * donne le prix unitaire (total ÷ quantité), le sous-détail restant affiché en rouge pour comparaison.
 */
export default function PositionRow({
  position, printNumber, actions, onSaving, onMove, dragging, dropPlace, onDragStart, onDragEnd, onDragOver, onDrop, onOpenBreakdown,
  showBreakdown = false, hidePrices = false, showQuoted = false, onInsertAbove,
}: PositionRowProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(position))
  // Montant en cours de saisie (null = montant calculé quantité × prix).
  const [amountEdit, setAmountEdit] = useState<string | null>(null)
  const saved = useRef(JSON.stringify(draft))
  const latest = useRef(draft)
  const timer = useRef<number | undefined>(undefined)
  const removed = useRef(false) // ligne supprimée : plus aucun enregistrement
  const rowRef = useRef<HTMLTableRowElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const isItem = position.kind === 'item'
  const isPageBreak = position.kind === 'pagebreak'
  const hasBreakdown = position.calculated_price !== null

  // La description prend la hauteur de son texte, comme sur la feuille : on voit tout de suite un libellé trop long.
  useLayoutEffect(() => {
    const area = areaRef.current
    if (area) {
      area.style.height = 'auto'
      area.style.height = `${area.scrollHeight}px`
    }
  }, [draft.description])

  async function save() {
    window.clearTimeout(timer.current)
    const current = latest.current
    const serialized = JSON.stringify(current)
    if (removed.current || serialized === saved.current || (!isPageBreak && !current.description.trim())) {
      return
    }
    saved.current = serialized
    onSaving(true)
    const payload: PositionPayload = {
      kind: position.kind,
      code: current.code.trim() || null,
      description: current.description.trim(),
      unit: current.unit.trim() || null,
      quantity: toNumber(current.quantity),
      unit_price: toNumber(current.unit_price),
      cost_price: position.cost_price,
      is_optional: current.is_optional,
      internal_remark: position.internal_remark,
    }
    try {
      const document = await actions.updatePosition(position.id, payload)
      // Avec un sous-détail, le prix vient du serveur (total ÷ quantité) : on le reprend sans toucher au reste de la saisie.
      const fresh = document.steps?.flatMap((step) => step.positions).find((item) => item.id === position.id)
      if (fresh && fresh.calculated_price !== null && text(fresh.unit_price) !== latest.current.unit_price) {
        const next = { ...latest.current, unit_price: text(fresh.unit_price) }
        latest.current = next
        saved.current = JSON.stringify(next)
        setDraft(next)
      }
    } catch {
      saved.current = ''
      toast("La position n'a pas pu être enregistrée.", 'error')
    } finally {
      onSaving(false)
    }
  }

  function change(patch: Partial<Draft>, immediate = false) {
    const next = { ...latest.current, ...patch }
    latest.current = next
    setDraft(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void save(), immediate ? 0 : 1500)
  }

  // Si la ligne disparaît (changement d'onglet ou de document) avec une saisie en attente, on l'envoie.
  const flush = useRef(save)
  useEffect(() => {
    flush.current = save
  })
  useEffect(() => () => void flush.current(), [])

  function onBlur(event: React.FocusEvent<HTMLTableRowElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      void save()
    }
  }

  /** Entrée : passe au champ suivant de la ligne, puis au champ d'ajout de l'étape. */
  function onEnter(event: React.KeyboardEvent<HTMLInputElement>, next: 'price' | 'picker') {
    if (event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    const selector = next === 'price' ? `[data-price="${position.id}"]` : `[data-picker="${position.document_step_id}"]`
    const target = document.querySelector<HTMLInputElement>(selector)
    target?.focus()
    target?.select()
  }

  /** Côté de la ligne visé par le curseur : moitié haute ou basse. */
  function placeFromEvent(event: React.DragEvent<HTMLTableRowElement>): DropPlace {
    const rect = event.currentTarget.getBoundingClientRect()
    return event.clientY < rect.top + rect.height / 2 ? 'above' : 'below'
  }

  function remove() {
    removed.current = true
    window.clearTimeout(timer.current)
    void actions.deletePosition(position.id).catch(() => {
      removed.current = false
      toast('Suppression impossible.', 'error')
    })
  }

  const quantity = toNumber(draft.quantity)
  const price = toNumber(draft.unit_price)
  const amount = isItem && quantity !== null && price !== null ? Math.round(quantity * price * 100) / 100 : null
  const priceDiffers = hasBreakdown && price !== null && Math.abs(price - (position.calculated_price ?? 0)) >= 0.005

  /** Total de la ligne saisi à la main : il donne le prix unitaire (total ÷ quantité). */
  function changeAmount(value: string) {
    setAmountEdit(value)
    const total = toNumber(value)
    if (total !== null && quantity !== null && quantity > 0) {
      change({ unit_price: text(Math.round((total / quantity) * 100) / 100) })
    }
  }
  const breakdownQuantity = position.quantity !== null && position.quantity > 0 ? position.quantity : 1
  const breakdownTotal = Math.round((position.costs ?? []).reduce((sum, cost) => sum + cost.sale, 0) * 100) / 100

  const dropClass =
    dropPlace === 'above' ? 'shadow-[inset_0_3px_0_0_#1d3f9c]' : dropPlace === 'below' ? 'shadow-[inset_0_-3px_0_0_#1d3f9c]' : ''

  const handle = (
    <td className="relative py-1 align-top">
      {onInsertAbove && <InsertAboveButton onClick={onInsertAbove} />}
      <button
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', String(position.id))
          if (rowRef.current) {
            event.dataTransfer.setDragImage(rowRef.current, 24, 18)
          }
          onDragStart()
        }}
        onDragEnd={onDragEnd}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault()
            onMove(event.key === 'ArrowUp' ? -1 : 1)
          }
        }}
        title="Glisser pour déplacer la ligne (au clavier : flèches haut et bas)"
        data-handle={position.id}
        aria-label="Déplacer la ligne"
        className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-gray-300 transition hover:bg-gray-100 hover:text-gray-600 focus:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 active:cursor-grabbing group-hover:text-gray-400"
      >
        <Icon name="grip" className="h-4 w-4" />
      </button>
    </td>
  )

  const rowProps = {
    ref: rowRef,
    onDragOver: (event: React.DragEvent<HTMLTableRowElement>) => {
      event.preventDefault()
      onDragOver(placeFromEvent(event))
    },
    onDrop: (event: React.DragEvent<HTMLTableRowElement>) => {
      event.preventDefault()
      onDrop(placeFromEvent(event))
    },
  }

  if (isPageBreak) {
    return (
      <tr {...rowProps} className={`group transition-opacity ${dragging ? 'opacity-40' : ''} ${dropClass}`}>
        {handle}
        <td colSpan={showQuoted ? 7 : 6} className="py-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-400" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
            <span className="h-0 flex-1 border-t-2 border-dashed border-gray-300" />
            <Icon name="pagebreak" className="h-3.5 w-3.5" />
            Saut de page
            <span className="h-0 flex-1 border-t-2 border-dashed border-gray-300" />
          </div>
        </td>
        <td className="py-1 pl-2">
          <span className="flex items-center justify-end">
            <button
              type="button"
              title="Retirer le saut de page"
              onClick={remove}
              className="rounded p-1 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-focus-within:opacity-100 group-hover:opacity-100"
            >
              <Icon name="trash" className="h-3.5 w-3.5" />
            </button>
          </span>
        </td>
      </tr>
    )
  }

  return (
    <>
      <tr
        {...rowProps}
        onBlur={onBlur}
        className={`group align-top transition-opacity ${isItem && !(showBreakdown && hasBreakdown) ? 'border-b border-gray-200' : ''} ${draft.is_optional ? 'text-gray-400' : ''} ${
          dragging ? 'opacity-40' : ''
        } ${dropClass}`}
      >
        {handle}
        <td
          className={`px-1 py-1 tabular-nums ${position.kind === 'title' ? 'pt-2.5 font-bold text-gray-800' : 'text-gray-500'}`}
          title={position.code ? `Code du catalogue : ${position.code}` : undefined}
        >
          {printNumber}
        </td>
        {/* Graisse et italique sur la cellule : les champs de l'espace de travail héritent leur police (.bb textarea). */}
        <td colSpan={isItem ? 1 : showQuoted ? 6 : 5} className={position.kind === 'title' ? 'pt-2 font-bold' : position.kind === 'text' ? 'py-0.5 italic' : 'py-0.5'}>
          <textarea
            ref={areaRef}
            value={draft.description}
            onChange={(e) => change({ description: e.target.value })}
            rows={1}
            className={`${CELL} block resize-none overflow-hidden leading-snug ${position.kind === 'text' ? 'text-gray-600' : ''}`}
            aria-label={position.kind === 'title' ? 'Sous-titre' : position.kind === 'text' ? 'Texte' : 'Description'}
            title={position.kind === 'title' ? 'Sous-titre : ouvre un sous-groupe numéroté' : position.kind === 'text' ? 'Texte sans prix ni numéro' : undefined}
          />
          {isItem && draft.is_optional && <div className="px-1 pb-0.5 text-[12px] text-gray-400">(option, hors total)</div>}
        </td>
        {isItem && (
          <>
            <td className="py-0.5">
              <UnitSelect
                value={draft.unit}
                onChange={(unit) => change({ unit })}
                onEnter={() => {
                  const field = document.querySelector<HTMLInputElement>(`[data-qty="${position.id}"]`)
                  field?.focus()
                  field?.select()
                }}
                className={CELL}
                aria-label="Unité"
              />
            </td>
            {showQuoted && (
              <td className="px-1 py-1 text-right tabular-nums text-gray-400" title="Quantité du devis">
                {position.quoted_quantity !== null ? text(position.quoted_quantity) : ''}
              </td>
            )}
            <td className="py-0.5">
              <input
                data-qty={position.id}
                title={showQuoted ? 'Quantité exécutée' : undefined}
                value={draft.quantity}
                onChange={(e) => change({ quantity: e.target.value })}
                onKeyDown={(e) => onEnter(e, 'price')}
                inputMode="decimal"
                className={`${CELL} text-right`}
                aria-label="Quantité"
              />
            </td>
            <td className="py-0.5">
              {hidePrices ? (
                <span className="block px-1 py-0.5 text-right text-gray-300" title="Prix masqués (option en haut du devis)">
                  ···
                </span>
              ) : (
                // Option : prix et montant entre parenthèses, comme à l'impression (hors total).
                <Parens on={draft.is_optional}>
                  <input
                    data-price={position.id}
                    value={draft.unit_price}
                    onChange={(e) => change({ unit_price: e.target.value })}
                    onKeyDown={(e) => onEnter(e, 'picker')}
                    inputMode="decimal"
                    title={hasBreakdown ? `Sous-détail : ${fmtAmount(breakdownTotal)} ÷ ${qty(breakdownQuantity)} = ${fmtAmount(position.calculated_price)}${priceDiffers ? ' (prix corrigé à la main)' : ''}` : undefined}
                    className={`${CELL} text-right ${hasBreakdown ? (priceDiffers ? 'text-accent-700' : 'text-primary-800') : ''}`}
                    aria-label="Prix unitaire"
                  />
                </Parens>
              )}
            </td>
            <td className="py-0.5">
              {hidePrices ? (
                ''
              ) : (
                <Parens on={draft.is_optional}>
                  <input
                    data-amount={position.id}
                    value={amountEdit ?? (amount !== null ? fmtAmount(amount) : '')}
                    onChange={(e) => changeAmount(e.target.value)}
                    onFocus={() => setAmountEdit(amount !== null ? text(amount) : '')}
                    onBlur={() => setAmountEdit(null)}
                    onKeyDown={(e) => onEnter(e, 'picker')}
                    disabled={quantity === null || quantity <= 0}
                    inputMode="decimal"
                    title="Montant de la ligne : un total saisi donne le prix unitaire (total ÷ quantité)"
                    className={`${CELL} text-right disabled:hover:border-transparent`}
                    aria-label="Montant"
                  />
                </Parens>
              )}
            </td>
          </>
        )}
        <td className="py-1 pl-2">
          <span className="flex items-center justify-end gap-0.5">
            {isItem && (
              <input
                type="checkbox"
                checked={draft.is_optional}
                onChange={(e) => change({ is_optional: e.target.checked }, true)}
                title="Option : imprimée, mais hors total"
                aria-label="Option"
                className={`mr-0.5 h-3.5 w-3.5 accent-primary-600 transition ${draft.is_optional ? '' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'}`}
              />
            )}
            {isItem && (
              <button
                type="button"
                title={hasBreakdown ? 'Sous-détail de prix (coûts par famille)' : 'Créer le sous-détail de prix de cette position'}
                onClick={onOpenBreakdown}
                className={`rounded p-1 transition hover:bg-primary-50 hover:text-primary-700 ${
                  hasBreakdown ? 'text-primary-600' : 'text-gray-400 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'
                }`}
              >
                <Icon name="calculator" className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              title="Supprimer la position"
              onClick={remove}
              className="rounded p-1 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-focus-within:opacity-100 group-hover:opacity-100"
            >
              <Icon name="trash" className="h-3.5 w-3.5" />
            </button>
          </span>
        </td>
      </tr>
      {/* Sous-détail en rouge, très compact, sous la position (option « Afficher les sous-détails »). */}
      {isItem && showBreakdown && hasBreakdown && (
        <tr className={`border-b border-gray-200 ${dragging ? 'opacity-40' : ''}`}>
          <td />
          <td />
          <td colSpan={showQuoted ? 6 : 5} className="pb-1.5 pl-3 pr-1 align-top">
            <button
              type="button"
              onClick={onOpenBreakdown}
              title="Ouvrir le sous-détail de prix"
              className="block w-full text-left text-[10.5px] leading-[1.35] text-red-700 hover:text-red-900"
              style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
            >
              {(position.costs ?? []).map((cost, index) => {
                const counted = computedQuantity(cost, breakdownQuantity)
                return (
                  // Le libellé passe à la ligne comme un texte ; seul le calcul (quantité × prix = vente) reste insécable.
                  <span key={cost.id}>
                    {index > 0 && <span className="text-red-300"> · </span>}
                    <span className="font-semibold">{costFamily(cost.family).code}</span> {cost.label}{' '}
                    <span className="whitespace-nowrap">
                      {qty(counted)}
                      {cost.unit ? ` ${cost.unit}` : ''}
                      {!hidePrices && (
                        <>
                          {' '}
                          × {fmtAmount(cost.unit_sale ?? cost.unit_cost * (1 + cost.markup_percent / 100))} = {fmtAmount(cost.sale)}
                        </>
                      )}
                    </span>
                  </span>
                )
              })}
              {!hidePrices && (
                <span className="whitespace-nowrap font-semibold">
                  <span className="text-red-300"> · </span>
                  Total {fmtAmount(breakdownTotal)} ÷ {qty(breakdownQuantity)} = {fmtAmount(position.calculated_price)}
                  {priceDiffers && price !== null && (
                    <span className="font-normal">
                      {' '}
                      → corrigé à {fmtAmount(price)} (total {fmtAmount(amount)})
                    </span>
                  )}
                </span>
              )}
            </button>
          </td>
          <td />
        </tr>
      )}
    </>
  )
}
