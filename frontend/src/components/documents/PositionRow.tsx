import { useEffect, useRef, useState } from 'react'
import { toNumber } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import type { DocumentActions, PositionPayload } from '@/hooks/useDocuments'
import type { DocumentPosition } from '@/types'
import { Icon } from '@/components/icons'

interface Draft {
  code: string
  description: string
  unit: string
  quantity: string
  unit_price: string
  is_optional: boolean
}

const text = (value: number | null) => (value === null ? '' : String(value))

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
  'w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] outline-none transition hover:border-gray-200 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100'

export type DropPlace = 'above' | 'below'

interface PositionRowProps {
  position: DocumentPosition
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
}

/**
 * Ligne de devis éditable en place. Le brouillon local fait foi pendant la saisie ; il est envoyé
 * à la sortie de la ligne ou 1,5 s après la dernière frappe. Entrée : quantité → prix → champ d'ajout.
 * La poignée (à gauche) se saisit à la souris pour déplacer la ligne ; au clavier, flèches haut et bas.
 */
export default function PositionRow({
  position, actions, onSaving, onMove, dragging, dropPlace, onDragStart, onDragEnd, onDragOver, onDrop,
}: PositionRowProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(position))
  const saved = useRef(JSON.stringify(draft))
  const latest = useRef(draft)
  const timer = useRef<number | undefined>(undefined)
  const removed = useRef(false) // ligne supprimée : plus aucun enregistrement
  const rowRef = useRef<HTMLTableRowElement>(null)
  const isItem = position.kind === 'item'

  async function save() {
    window.clearTimeout(timer.current)
    const current = latest.current
    const serialized = JSON.stringify(current)
    if (removed.current || serialized === saved.current || !current.description.trim()) {
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
      await actions.updatePosition(position.id, payload)
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

  const quantity = toNumber(draft.quantity)
  const price = toNumber(draft.unit_price)
  const amount = isItem && quantity !== null && price !== null ? Math.round(quantity * price * 100) / 100 : null

  const dropClass =
    dropPlace === 'above' ? 'shadow-[inset_0_3px_0_0_#1d3f9c]' : dropPlace === 'below' ? 'shadow-[inset_0_-3px_0_0_#1d3f9c]' : ''

  return (
    <tr
      ref={rowRef}
      onBlur={onBlur}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver(placeFromEvent(event))
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(placeFromEvent(event))
      }}
      className={`group border-b border-gray-100 align-top transition-opacity ${draft.is_optional ? 'text-gray-400' : ''} ${
        dragging ? 'opacity-40' : ''
      } ${dropClass}`}
    >
      <td className="w-7 py-1.5 pl-2 align-middle">
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
      <td className="w-24 py-0.5">
        <input value={draft.code} onChange={(e) => change({ code: e.target.value })} className={`${CELL} text-gray-500`} aria-label="Code" />
      </td>
      <td className="py-0.5">
        <textarea
          value={draft.description}
          onChange={(e) => change({ description: e.target.value })}
          rows={Math.min(6, Math.max(1, Math.ceil(draft.description.length / 95)))}
          className={`${CELL} resize-none leading-snug ${position.kind === 'title' ? 'font-semibold text-gray-800' : ''} ${
            position.kind === 'text' ? 'italic text-gray-600' : ''
          }`}
          aria-label="Description"
        />
      </td>
      {isItem ? (
        <>
          <td className="w-16 py-0.5">
            <input value={draft.unit} onChange={(e) => change({ unit: e.target.value })} className={CELL} aria-label="Unité" />
          </td>
          <td className="w-24 py-0.5">
            <input
              data-qty={position.id}
              value={draft.quantity}
              onChange={(e) => change({ quantity: e.target.value })}
              onKeyDown={(e) => onEnter(e, 'price')}
              inputMode="decimal"
              className={`${CELL} text-right`}
              aria-label="Quantité"
            />
          </td>
          <td className="w-28 py-0.5">
            <input
              data-price={position.id}
              value={draft.unit_price}
              onChange={(e) => change({ unit_price: e.target.value })}
              onKeyDown={(e) => onEnter(e, 'picker')}
              inputMode="decimal"
              className={`${CELL} text-right`}
              aria-label="Prix unitaire"
            />
          </td>
          <td className="w-28 px-3 py-1.5 text-right tabular-nums">
            {amount !== null ? fmtAmount(amount) : <span className="text-gray-300">—</span>}
          </td>
          <td className="w-14 py-1.5 text-center">
            <input
              type="checkbox"
              checked={draft.is_optional}
              onChange={(e) => change({ is_optional: e.target.checked }, true)}
              title="Option : affichée mais hors total"
              className="h-4 w-4 accent-primary-600"
            />
          </td>
        </>
      ) : (
        <td colSpan={5} className="px-3 py-1.5 text-right text-[11px] uppercase tracking-wider text-gray-300">
          {position.kind === 'title' ? 'Sous-titre' : 'Texte'}
        </td>
      )}
      <td className="w-12 py-1 pr-2">
        <span className="flex justify-end opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            title="Supprimer la position"
            onClick={() => {
              removed.current = true
              window.clearTimeout(timer.current)
              void actions.deletePosition(position.id).catch(() => {
                removed.current = false
                toast('Suppression impossible.', 'error')
              })
            }}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        </span>
      </td>
    </tr>
  )
}
