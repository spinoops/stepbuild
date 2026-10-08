import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fmtAmount } from '@/lib/format'
import { useDebounced } from '@/hooks/useDebounced'
import type { Paginated, PriceElement } from '@/types'
import { Icon } from '@/components/icons'
import ElementBrowserDialog from '@/components/shared/ElementBrowserDialog'

interface ElementPickerProps {
  /** Famille d'éléments de coûts cherchée (1 salaire … 6 tiers). */
  family: number
  placeholder: string
  onPick: (element: PriceElement) => void
  onFree: (label: string) => void
  /** Prix affichés dans les résultats (jamais pour l'ouvrier). */
  showPrices?: boolean
  disabled?: boolean
  /** Attribut data-picker pour ramener le focus au clavier. */
  pickerKey?: string
}

/**
 * Champ d'ajout d'une ligne de ressource : on tape, les éléments de coûts de la famille apparaissent,
 * Entrée reprend l'élément (libellé, unité, prix net) ou crée une ligne libre avec le texte saisi.
 * Utilisé par le sous-détail de prix du devis et par les rapports journaliers.
 */
export default function ElementPicker({ family, placeholder, onPick, onFree, showPrices = true, disabled = false, pickerKey }: ElementPickerProps) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [browsing, setBrowsing] = useState(false)
  const query = useDebounced(term.trim(), 150)

  const results = useQuery({
    queryKey: ['price-elements', 'picker', family, query],
    queryFn: async () => (await api.get<Paginated<PriceElement>>('/price-elements', { params: { search: query, family, per_page: 8 } })).data.data,
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
  const found = query.length >= 2 ? (results.data ?? []) : []
  const choices = found.length + (term.trim() ? 1 : 0)

  function choose(index: number) {
    const label = term.trim()
    if (index < found.length) {
      onPick(found[index])
    } else if (label) {
      onFree(label)
    } else {
      return
    }
    setTerm('')
    setActive(0)
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 text-gray-400">
        <Icon name="plus" className="h-3.5 w-3.5 shrink-0" />
        <input
          value={term}
          disabled={disabled}
          data-picker={pickerKey}
          onChange={(e) => {
            setTerm(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((value) => Math.max(0, Math.min(choices - 1, value + (event.key === 'ArrowDown' ? 1 : -1))))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              choose(active)
            } else if (event.key === 'Escape' && (open || term)) {
              event.stopPropagation()
              setTerm('')
              setOpen(false)
            }
          }}
          placeholder={placeholder}
          className="h-7 w-full bg-transparent text-[12px] text-gray-700 outline-none placeholder:text-gray-300 focus:placeholder:text-gray-400 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setBrowsing(true)}
          disabled={disabled}
          title="Rechercher dans les éléments de coûts (fenêtre)"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-primary-700 disabled:opacity-40"
        >
          <Icon name="search" className="h-3.5 w-3.5" />
        </button>
      </div>
      <ElementBrowserDialog open={browsing} onClose={() => setBrowsing(false)} family={family} showPrices={showPrices} onPick={(element) => onPick(element)} />
      {open && term.trim() && (
        <ul className="absolute left-4 z-20 mt-0.5 w-[520px] overflow-hidden rounded-md border border-gray-200 bg-white py-1 text-[13px] shadow-lg">
          {found.map((element, index) => (
            <li key={element.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={`flex w-full items-baseline gap-2 px-3 py-1 text-left ${index === active ? 'bg-primary-50 text-primary-800' : 'hover:bg-gray-50'}`}
              >
                <span className="w-16 shrink-0 text-[12px] text-gray-400">{element.number}</span>
                <span className="min-w-0 flex-1 truncate">{element.description}</span>
                <span className="shrink-0 text-[12px] text-gray-500">
                  {element.unit ?? ''} {showPrices && element.net_price !== null ? `· ${fmtAmount(element.net_price)}` : ''}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(found.length)}
              className={`flex w-full items-center gap-2 px-3 py-1 text-left ${active === found.length ? 'bg-primary-50 text-primary-800' : 'hover:bg-gray-50'}`}
            >
              <Icon name="edit" className="h-3.5 w-3.5 text-gray-400" />
              Ligne libre « {term.trim()} »
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
