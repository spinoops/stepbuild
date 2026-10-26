import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUnits } from '@/hooks/useUnits'
import type { Unit } from '@/types'

interface UnitSelectProps {
  value: string
  onChange: (value: string) => void
  /** Entrée après le choix d'une unité (ex. : passer à la quantité). */
  onEnter?: () => void
  className?: string
  'aria-label'?: string
  disabled?: boolean
}

/** Texte comparable : sans accents, sans casse, sans point final (« H. » = « h »). */
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.$/, '')
    .trim()

/**
 * Choix de l'unité de mesure : liste par ordre alphabétique et recherche en tapant les premières lettres
 * (« m2 », « pce », « jo »…). Entrée ou Tab prend l'unité en surbrillance, Échap annule, flèches pour
 * parcourir. Une valeur absente de la liste (reprise BauBit, unité désactivée) reste affichée et conservée.
 */
export default function UnitSelect({ value, onChange, onEnter, className = '', disabled, ...props }: UnitSelectProps) {
  const units = useUnits()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState<string | null>(null) // null = pas de recherche en cours
  const [active, setActive] = useState(0)
  const [box, setBox] = useState<{ left: number; top: number; width: number; up: boolean } | null>(null)

  const sorted = useMemo(
    () => [...(units.data ?? [])].sort((a, b) => a.code.localeCompare(b.code, 'fr', { sensitivity: 'base', numeric: true })),
    [units.data],
  )

  // Début du code d'abord, puis début du libellé, puis le reste qui contient le texte.
  const matches = useMemo<Unit[]>(() => {
    const needle = fold(term ?? '')
    if (!needle) {
      return sorted
    }
    const starts = sorted.filter((unit) => fold(unit.code).startsWith(needle))
    const labels = sorted.filter((unit) => !starts.includes(unit) && fold(unit.label ?? '').startsWith(needle))
    // « Contient » seulement dès deux lettres : avec une seule, la liste resterait encombrée.
    const contains =
      needle.length < 2 ? [] : sorted.filter((unit) => !starts.includes(unit) && !labels.includes(unit) && `${fold(unit.code)} ${fold(unit.label ?? '')}`.includes(needle))
    return [...starts, ...labels, ...contains]
  }, [sorted, term])

  const current = sorted.find((unit) => unit.code === value)

  function place() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }
    const up = rect.bottom + 260 > window.innerHeight && rect.top > 260
    setBox({ left: rect.left, top: up ? rect.top : rect.bottom, width: Math.max(rect.width, 200), up })
  }

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    place()
    const update = () => place()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useLayoutEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function show() {
    const index = sorted.findIndex((unit) => unit.code === value)
    setActive(Math.max(0, index))
    setTerm(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setTerm(null)
  }

  function pick(unit: Unit | null) {
    const code = unit?.code ?? ''
    if (code !== value) {
      onChange(code)
    }
    close()
  }

  /** À la sortie du champ : une recherche tapée prend la première unité trouvée ; un champ vidé efface. */
  function commitTyped() {
    if (term === null) {
      close()
      return
    }
    if (term.trim() === '') {
      pick(null)
    } else if (matches.length > 0) {
      pick(matches[Math.min(active, matches.length - 1)])
    } else {
      close() // rien trouvé : l'unité actuelle reste
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        show()
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((index) => Math.min(Math.max(index + step, 0), Math.max(matches.length - 1, 0)))
    } else if (event.key === 'Enter') {
      if (open) {
        event.preventDefault()
        if (term !== null && term.trim() === '') {
          pick(null)
        } else if (matches.length > 0) {
          pick(matches[Math.min(active, matches.length - 1)])
        } else {
          close()
        }
        onEnter?.()
      } else if (onEnter) {
        event.preventDefault()
        onEnter()
      }
    } else if (event.key === 'Tab') {
      if (open) {
        commitTyped()
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }
  }

  const shown = term ?? value
  const list =
    open && box
      ? createPortal(
          <div
            ref={listRef}
            role="listbox"
            className="fixed z-[200] max-h-[250px] overflow-y-auto rounded-md border border-gray-200 bg-white py-1 text-[13px] shadow-lg"
            style={{ left: box.left, width: box.width, ...(box.up ? { bottom: window.innerHeight - box.top + 2 } : { top: box.top + 2 }) }}
            onMouseDown={(event) => event.preventDefault()} // garde le focus dans le champ
          >
            {matches.length === 0 && <div className="px-3 py-1.5 text-gray-400">{units.isLoading ? 'Chargement…' : 'Aucune unité.'}</div>}
            {matches.map((unit, index) => (
              <div
                key={unit.id}
                role="option"
                aria-selected={unit.code === value}
                data-index={index}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(unit)}
                className={`flex cursor-pointer items-baseline gap-3 px-3 py-1 ${index === active ? 'bg-primary-50 text-primary-800' : 'text-gray-800'}`}
              >
                <span className={`w-14 shrink-0 ${unit.code === value ? 'font-semibold' : ''}`}>{unit.code}</span>
                <span className="truncate text-[12px] text-gray-500">{unit.label}</span>
              </div>
            ))}
            {value && (
              <div
                onClick={() => pick(null)}
                className="mt-1 cursor-pointer border-t border-gray-100 px-3 py-1 text-[12px] text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              >
                Sans unité
              </div>
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <input
        ref={inputRef}
        value={shown}
        disabled={disabled}
        onFocus={(event) => {
          show()
          event.currentTarget.select()
        }}
        onClick={() => !open && show()}
        onChange={(event) => {
          setTerm(event.target.value)
          setActive(0)
          if (!open) {
            setOpen(true)
          }
        }}
        onBlur={commitTyped}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        title={current?.label ?? (value ? `${value} (hors liste)` : 'Tapez les premières lettres de l’unité')}
        className={className}
        {...props}
      />
      {list}
    </>
  )
}
