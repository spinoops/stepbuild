import { useMemo, useState } from 'react'
import { useBreakdownTemplates } from '@/hooks/useBreakdownTemplates'
import { Icon } from '@/components/icons'
import type { BreakdownTemplate } from '@/types'

interface TemplatePickerProps {
  onPick: (template: BreakdownTemplate) => void
  disabled?: boolean
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Choix d'un sous-détail type : on tape un mot de l'ouvrage (carrelage, crépi, coffrage…), les modèles
 * correspondants apparaissent, Entrée charge le premier. Recherche en mémoire sur la liste chargée une fois.
 */
export default function TemplatePicker({ onPick, disabled = false }: TemplatePickerProps) {
  const templates = useBreakdownTemplates()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const found = useMemo(() => {
    const words = normalize(term).split(/\s+/).filter(Boolean)
    const list = templates.data ?? []
    if (words.length === 0) {
      return list.slice(0, 12)
    }
    return list
      .filter((item) => {
        const haystack = normalize(`${item.group ?? ''} ${item.name}`)
        return words.every((word) => haystack.includes(word))
      })
      .slice(0, 12)
  }, [templates.data, term])

  function choose(index: number) {
    const template = found[index]
    if (!template) {
      return
    }
    onPick(template)
    setTerm('')
    setOpen(false)
    setActive(0)
  }

  return (
    <div className="relative">
      <div className="flex h-7 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2">
        <Icon name="book" className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <input
          value={term}
          disabled={disabled}
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
              setActive((value) => Math.max(0, Math.min(found.length - 1, value + (event.key === 'ArrowDown' ? 1 : -1))))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              choose(active)
            } else if (event.key === 'Escape' && open) {
              event.stopPropagation()
              setOpen(false)
            }
          }}
          placeholder="Charger un sous-détail type (ouvrage)…"
          className="w-64 bg-transparent text-[12px] text-gray-700 outline-none placeholder:text-gray-400"
        />
      </div>
      {open && (
        <ul className="absolute left-0 z-30 mt-0.5 w-[460px] overflow-hidden rounded-md border border-gray-200 bg-white py-1 text-[13px] shadow-lg">
          {found.map((template, index) => (
            <li key={template.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={`flex w-full items-baseline gap-2 px-3 py-1 text-left ${index === active ? 'bg-primary-50 text-primary-800' : 'hover:bg-gray-50'}`}
              >
                <span className="w-28 shrink-0 truncate text-[12px] text-gray-400">{template.group}</span>
                <span className="min-w-0 flex-1 truncate">{template.name}</span>
                <span className="shrink-0 text-[12px] text-gray-400">
                  {template.dimension_unit ?? ''} · {template.lines_count ?? 0} l.
                </span>
              </button>
            </li>
          ))}
          {found.length === 0 && <li className="px-3 py-1 text-gray-400">{templates.isLoading ? 'Chargement…' : 'Aucun modèle.'}</li>}
        </ul>
      )}
    </div>
  )
}
