import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { buildIndex, timedSearch } from '@/lib/searchIndex'
import type { SearchIndexResponse } from '@/lib/searchIndex'
import { Icon } from '@/components/icons'

/**
 * Recherche instantanée globale (Ctrl+K). L'index est chargé une fois puis interrogé en
 * mémoire : résultats à chaque frappe dès 2 lettres, sans réseau, tolérants aux accents et
 * aux fautes. Navigation au clavier (↑ ↓ Entrée, Échap), ouverture directe de la fiche.
 */
export default function SearchBox() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const { data: index, isLoading } = useQuery({
    queryKey: ['search-index'],
    queryFn: async () => buildIndex((await api.get<SearchIndexResponse>('/search/index')).data),
    staleTime: 5 * 60_000,
  })

  const { groups, tookMs } = useMemo(() => {
    if (!index) {
      return { groups: [], tookMs: 0 }
    }
    return timedSearch(index, term)
  }, [index, term])

  const flat = groups.flatMap((group) => group.items.map((item) => ({ ...item, path: group.path })))
  // Position de chaque groupe dans la liste à plat (navigation clavier).
  const offsets = groups.map((_, position) => groups.slice(0, position).reduce((sum, group) => sum + group.items.length, 0))

  // Ctrl+K (ou Cmd+K) : focus sur la recherche.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function go(position: number) {
    const item = flat[position]
    if (!item) {
      return
    }
    navigate(`${item.path}?id=${item.id}`)
    setOpen(false)
    setTerm('')
    inputRef.current?.blur()
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((value) => Math.min(flat.length - 1, value + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((value) => Math.max(0, value - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(active)
    } else if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative ml-auto">
      <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Rechercher une adresse, un article, un prix…"
        className="h-8 w-80 rounded-md border border-white/10 bg-white/10 pl-8 pr-12 text-[13px] text-white outline-none transition placeholder:text-gray-400 focus:border-white/30 focus:bg-white/15"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/20 px-1 text-[10px] text-gray-400">
        Ctrl K
      </kbd>

      {open && term.trim().length >= 2 && (
        <div data-search-results className="absolute right-0 top-10 z-50 w-[460px] overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-800 shadow-xl">
          {groups.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-gray-400">
              {isLoading ? "Chargement de l'index…" : `Aucun résultat pour « ${term.trim()} ».`}
            </div>
          ) : (
            <div className="max-h-[420px] overflow-auto py-1">
              {groups.map((group, groupIndex) => (
                <div key={group.key}>
                  <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {group.title}
                  </div>
                  {group.items.map((item, itemIndex) => {
                    const current = offsets[groupIndex] + itemIndex
                    return (
                      <button
                        key={`${group.key}-${item.id}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActive(current)}
                        onClick={() => go(current)}
                        className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-[13px] ${
                          current === active ? 'bg-primary-50 text-primary-800' : ''
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <span className="shrink-0 text-[11px] text-gray-400">{item.sublabel}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
          {groups.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-1 text-right text-[10px] text-gray-400">
              {flat.length} résultat{flat.length > 1 ? 's' : ''} · {tookMs < 1 ? '< 1' : Math.round(tookMs)} ms sur {index?.size ?? 0} éléments · ↑ ↓ Entrée
            </div>
          )}
        </div>
      )}
    </div>
  )
}
