import { useState } from 'react'
import { toNumber } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'

interface PriceCellProps {
  value: number | null
  /** Appelé à la sortie du champ ou sur Entrée quand la valeur a changé. */
  onSave: (value: number | null) => void
  disabled?: boolean
  /** Signale visuellement une valeur différente de la référence (prix client ≠ prix régie). */
  highlight?: boolean
  label: string
}

const CELL =
  'h-7 w-[84px] rounded border border-transparent bg-transparent px-1.5 text-right text-[13px] tabular-nums outline-none transition hover:border-gray-200 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 disabled:cursor-default disabled:hover:border-transparent'

/**
 * Prix unitaire éditable en place (brut, régie ou client) : brouillon local, enregistré à la sortie
 * ou sur Entrée ; la valeur affichée se resynchronise quand le serveur renvoie la ligne.
 */
export default function PriceCell({ value, onSave, disabled = false, highlight = false, label }: PriceCellProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [seen, setSeen] = useState(value)
  // Nouvelle valeur du serveur : le brouillon local est abandonné.
  if (seen !== value) {
    setSeen(value)
    setDraft(null)
  }

  function commit() {
    if (draft === null) return
    const next = toNumber(draft)
    setDraft(null)
    if ((next ?? null) !== (value ?? null)) {
      onSave(next)
    }
  }

  return (
    <input
      value={draft ?? (value === null ? '' : fmtAmount(value))}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => {
        setDraft(value === null ? '' : String(value))
        window.setTimeout(() => e.target.select(), 0)
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          setDraft(null)
          e.currentTarget.blur()
        }
      }}
      disabled={disabled}
      inputMode="decimal"
      aria-label={label}
      className={`${CELL} ${highlight ? 'font-semibold text-accent-700' : ''}`}
    />
  )
}
