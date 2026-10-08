import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useStockHistory, useStockItems, useStockMutations, useStockProducts } from '@/hooks/useStock'
import type { MovementType } from '@/hooks/useStock'
import { useDebounced } from '@/hooks/useDebounced'
import { Icon } from '@/components/icons'
import { fmtAmount } from '@/lib/format'
import { normalize } from '@/lib/searchIndex'
import { toast } from '@/lib/toast'
import type { StockItem, StockProduct } from '@/types'

type Filter = 'all' | 'low' | 'out'

const STATUS: Record<StockItem['status'], { label: string; className: string; rank: number }> = {
  rupture: { label: 'Rupture', className: 'bg-red-100 text-red-700', rank: 0 },
  bas: { label: 'À commander', className: 'bg-amber-100 text-amber-800', rank: 1 },
  ok: { label: 'OK', className: 'bg-emerald-100 text-emerald-700', rank: 2 },
}

const QUANTITY_PATTERN = /^\s*([+-])?\s*(\d[\d'’\s]*([.,]\d{1,2})?)\s*$/

/** « +5 » → entrée, « -3 » → sortie, « 12 » → inventaire (quantité comptée). */
function parseQuantity(text: string): { type: MovementType; quantity: number } | null {
  const match = QUANTITY_PATTERN.exec(text)
  if (!match) {
    return null
  }
  const quantity = Number(match[2].replace(/[\s'’]/g, '').replace(',', '.'))
  if (!Number.isFinite(quantity)) {
    return null
  }
  if (match[1] === '+') {
    return quantity > 0 ? { type: 'entree', quantity } : null
  }
  if (match[1] === '-') {
    return quantity > 0 ? { type: 'sortie', quantity } : null
  }
  return { type: 'inventaire', quantity }
}

function fmtQty(value: number | null | undefined): string {
  if (value == null) {
    return ''
  }
  return Number.isInteger(value) ? String(value) : fmtAmount(value, 2)
}

function fmtWhen(iso: string | null): string {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * Vue des stocks : une seule page, pensée pour aller vite. Recherche instantanée, saisie des
 * quantités au clavier (« +5 », « -3 », « 12 » puis Entrée passe à la ligne suivante), seuils
 * « à commander », historique par produit. Aucun prix n'y apparaît.
 */
export default function StockPage() {
  const items = useStockItems()
  const { add, update, remove, move } = useStockMutations()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState(false)
  const [historyId, setHistoryId] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => {
    const all = items.data ?? []
    const words = normalize(search).split(/\s+/).filter(Boolean)
    return all
      .filter((item) => (filter === 'all' ? true : filter === 'out' ? item.status === 'rupture' : item.status !== 'ok'))
      .filter((item) => {
        if (words.length === 0) {
          return true
        }
        const text = normalize(`${item.number ?? ''} ${item.description ?? ''} ${item.location ?? ''} ${item.group_code ?? ''}`)
        return words.every((word) => text.includes(word))
      })
      .sort((a, b) => STATUS[a.status].rank - STATUS[b.status].rank || (a.description ?? '').localeCompare(b.description ?? '', 'fr'))
  }, [items.data, search, filter])

  const counts = useMemo(() => {
    const all = items.data ?? []
    return { total: all.length, low: all.filter((i) => i.status !== 'ok').length, out: all.filter((i) => i.status === 'rupture').length }
  }, [items.data])

  function focusQuantity(id: number) {
    const input = document.querySelector<HTMLInputElement>(`input[data-stock-qty="${id}"]`)
    if (input) {
      input.focus()
      input.select()
    }
  }

  function commitQuantity(item: StockItem, text: string, next?: () => void) {
    const parsed = parseQuantity(text)
    if (!parsed) {
      toast('Quantité invalide : « 12 », « +5 » ou « -3 ».', 'error')
      return
    }
    if (parsed.type === 'inventaire' && parsed.quantity === item.quantity) {
      next?.()
      return
    }
    move.mutate(
      { id: item.id, ...parsed },
      {
        onSuccess: next,
        onError: () => toast("Le mouvement n'a pas pu être enregistré.", 'error'),
      },
    )
  }

  // Après l'ajout d'un produit, le curseur va directement dans sa quantité (ligne rendue au prochain cycle).
  function onAdded(item: StockItem) {
    setSearch('')
    setFilter('all')
    window.setTimeout(() => focusQuantity(item.id), 50)
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-3 p-3 text-[14px] sm:p-5">
      {/* Barre de recherche + filtres + ajout */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearch('')
              }
              if (e.key === 'Enter' && rows[0]) {
                focusQuantity(rows[0].id)
              }
            }}
            placeholder="Rechercher un produit (nom, n°, emplacement)…"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-9 text-[15px] shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white text-[13px]">
          {(
            [
              ['all', `Tous (${counts.total})`],
              ['low', `À commander (${counts.low})`],
              ['out', `Rupture (${counts.out})`],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`h-11 px-3 ${filter === key ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAdding((open) => !open)}
          className="flex h-11 items-center gap-2 rounded-lg bg-accent-600 px-4 text-[14px] font-medium text-white shadow-sm hover:bg-accent-700"
        >
          <Icon name="plus" className="h-4 w-4" />
          Ajouter un produit
        </button>
      </div>

      {adding && (
        <ProductPicker
          onClose={() => {
            setAdding(false)
            searchRef.current?.focus()
          }}
          onPick={(product) =>
            add.mutate(
              { price_element_id: product.id },
              {
                onSuccess: (item) => {
                  toast(`${product.description} ajouté au stock.`, 'success')
                  onAdded(item)
                },
                onError: () => toast("Ce produit n'a pas pu être ajouté.", 'error'),
              },
            )
          }
        />
      )}

      {/* Tableau */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-[14px]">
          <thead className="sticky top-0 z-10 bg-gray-100 text-[12px] font-semibold text-gray-600 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Produit</th>
              <th className="w-36 px-3 py-2 text-left">Emplacement</th>
              <th className="w-32 px-3 py-2 text-right">Quantité</th>
              <th className="w-24 px-3 py-2 text-right">Min.</th>
              <th className="w-28 px-3 py-2 text-left">État</th>
              <th className="w-40 px-3 py-2 text-left">Dernier mouvement</th>
              <th className="w-20 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <StockRow
                key={item.id}
                item={item}
                historyOpen={historyId === item.id}
                onToggleHistory={() => setHistoryId(historyId === item.id ? null : item.id)}
                onQuantity={(text, goNext) => commitQuantity(item, text, goNext && rows[index + 1] ? () => focusQuantity(rows[index + 1].id) : undefined)}
                onMin={(value) => update.mutate({ id: item.id, min_quantity: value }, { onError: () => toast('Seuil non enregistré.', 'error') })}
                onLocation={(value) => update.mutate({ id: item.id, location: value }, { onError: () => toast('Emplacement non enregistré.', 'error') })}
                onRemove={() => {
                  if (window.confirm(`Retirer « ${item.description} » du suivi de stock ?`)) {
                    remove.mutate(item.id, { onError: () => toast('Suppression impossible.', 'error') })
                  }
                }}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                  {items.isLoading ? 'Chargement…' : counts.total === 0 ? 'Aucun produit suivi. Commencez par « Ajouter un produit ».' : 'Aucun produit ne correspond.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-gray-500">
        Dans la colonne Quantité : tapez <b>12</b> pour un comptage, <b>+5</b> pour une entrée, <b>-3</b> pour une sortie, puis <b>Entrée</b> pour passer au produit suivant.
      </p>
    </div>
  )
}

interface StockRowProps {
  item: StockItem
  historyOpen: boolean
  onToggleHistory: () => void
  onQuantity: (text: string, goNext: boolean) => void
  onMin: (value: number | null) => void
  onLocation: (value: string | null) => void
  onRemove: () => void
}

function StockRow({ item, historyOpen, onToggleHistory, onQuantity, onMin, onLocation, onRemove }: StockRowProps) {
  const status = STATUS[item.status]

  return (
    <>
      <tr className={`border-t border-gray-100 ${item.status === 'rupture' ? 'bg-red-50/60' : item.status === 'bas' ? 'bg-amber-50/60' : ''}`}>
        <td className="px-3 py-2">
          <div className="font-medium text-gray-900">{item.description}</div>
          <div className="text-[12px] text-gray-500">
            {item.number}
            {item.unit ? ` · ${item.unit}` : ''}
            {item.group_code ? ` · ${item.group_code}` : ''}
          </div>
        </td>
        <td className="px-3 py-2">
          <TextCell value={item.location ?? ''} placeholder="—" onCommit={(value) => onLocation(value === '' ? null : value)} />
        </td>
        <td className="px-3 py-2 text-right">
          <QuantityCell item={item} onCommit={onQuantity} />
        </td>
        <td className="px-3 py-2 text-right">
          <TextCell
            value={fmtQty(item.min_quantity)}
            placeholder="—"
            align="right"
            onCommit={(value) => {
              const parsed = value === '' ? null : parseQuantity(value)
              if (value !== '' && (!parsed || parsed.type !== 'inventaire')) {
                toast('Seuil invalide.', 'error')
                return
              }
              onMin(parsed ? parsed.quantity : null)
            }}
          />
        </td>
        <td className="px-3 py-2">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${status.className}`}>{status.label}</span>
        </td>
        <td className="px-3 py-2 text-[12px] text-gray-500">
          {item.counted_at ? (
            <>
              <div>{fmtWhen(item.counted_at)}</div>
              {item.counted_by && <div className="truncate">{item.counted_by}</div>}
            </>
          ) : (
            '—'
          )}
        </td>
        <td className="px-2 py-2 text-right whitespace-nowrap">
          <button type="button" onClick={onToggleHistory} title="Historique" className={`rounded-md p-1.5 hover:bg-gray-100 ${historyOpen ? 'text-primary-600' : 'text-gray-400'}`}>
            <Icon name="clock" className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} title="Retirer du stock" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600">
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </td>
      </tr>
      {historyOpen && (
        <tr className="border-t border-gray-100 bg-gray-50">
          <td colSpan={7} className="px-3 py-2">
            <History itemId={item.id} unit={item.unit} />
          </td>
        </tr>
      )}
    </>
  )
}

/** Quantité : brouillon local, enregistré sur Entrée (puis ligne suivante) ou à la sortie du champ. */
function QuantityCell({ item, onCommit }: { item: StockItem; onCommit: (text: string, goNext: boolean) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? fmtQty(item.quantity)

  function commit(goNext: boolean) {
    if (draft !== null && draft.trim() !== '' && draft !== fmtQty(item.quantity)) {
      onCommit(draft, goNext)
    } else if (goNext) {
      onCommit(fmtQty(item.quantity), true)
    }
    setDraft(null)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      commit(true)
    } else if (e.key === 'Escape') {
      setDraft(null)
      e.currentTarget.blur()
    }
  }

  return (
    <input
      data-stock-qty={item.id}
      value={shown}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => commit(false)}
      onKeyDown={onKeyDown}
      inputMode="decimal"
      className={`h-10 w-28 rounded-md border px-2 text-right text-[16px] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary-100 ${
        draft !== null ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
      }`}
    />
  )
}

function TextCell({ value, placeholder, align = 'left', onCommit }: { value: string; placeholder?: string; align?: 'left' | 'right'; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft !== null && draft.trim() !== value) {
      onCommit(draft.trim())
    }
    setDraft(null)
  }

  return (
    <input
      value={draft ?? value}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setDraft(null)
          e.currentTarget.blur()
        }
      }}
      className={`h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-[13px] hover:border-gray-200 focus:border-primary-500 focus:bg-white focus:outline-none ${align === 'right' ? 'text-right tabular-nums' : ''}`}
    />
  )
}

function History({ itemId, unit }: { itemId: number; unit: string | null }) {
  const history = useStockHistory(itemId)
  const labels: Record<string, string> = { entree: 'Entrée', sortie: 'Sortie', inventaire: 'Inventaire' }

  if (history.isLoading) {
    return <div className="text-[12px] text-gray-400">Chargement…</div>
  }
  if (!history.data?.length) {
    return <div className="text-[12px] text-gray-400">Aucun mouvement.</div>
  }
  return (
    <table className="w-full max-w-2xl text-[12px]">
      <tbody>
        {history.data.map((m) => (
          <tr key={m.id} className="text-gray-600">
            <td className="w-32 py-0.5">{fmtWhen(m.created_at)}</td>
            <td className="w-24 py-0.5">{labels[m.type] ?? m.type}</td>
            <td className={`w-20 py-0.5 text-right font-medium tabular-nums ${m.quantity < 0 ? 'text-red-600' : m.quantity > 0 ? 'text-emerald-700' : ''}`}>
              {m.quantity > 0 ? '+' : ''}
              {fmtQty(m.quantity)}
            </td>
            <td className="w-28 py-0.5 text-right tabular-nums">
              = {fmtQty(m.quantity_after)} {unit ?? ''}
            </td>
            <td className="py-0.5 pl-4 text-gray-500">{m.user}</td>
            <td className="py-0.5 pl-4 text-gray-500">{m.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Choix d'un produit du catalogue à mettre en stock (recherche serveur, flèches + Entrée). */
function ProductPicker({ onPick, onClose }: { onPick: (product: StockProduct) => void; onClose: () => void }) {
  const [term, setTerm] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const products = useStockProducts(useDebounced(term, 200))
  const list = products.data ?? []
  // La sélection reste dans la liste même quand les résultats changent.
  const active = Math.min(activeIndex, Math.max(list.length - 1, 0))

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(Math.min(active + 1, list.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(Math.max(active - 1, 0))
    } else if (e.key === 'Enter' && list[active]) {
      e.preventDefault()
      onPick(list[active])
      setTerm('')
      setActiveIndex(0)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-3">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={term}
          onChange={(e) => {
            setTerm(e.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Nom ou n° du produit dans le catalogue des éléments de coûts…"
          className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-[14px] outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />
        <button type="button" onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-white" title="Fermer">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      {term.trim().length >= 2 && (
        <ul className="mt-2 max-h-72 overflow-auto rounded-md border border-gray-200 bg-white">
          {list.map((product, index) => (
            <li key={product.id}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  onPick(product)
                  setTerm('')
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${index === active ? 'bg-primary-600 text-white' : 'hover:bg-gray-50'}`}
              >
                <span className={`w-20 shrink-0 text-[12px] ${index === active ? 'text-primary-100' : 'text-gray-500'}`}>{product.number}</span>
                <span className="flex-1 truncate">{product.description}</span>
                <span className={`text-[12px] ${index === active ? 'text-primary-100' : 'text-gray-500'}`}>{product.unit}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="px-3 py-3 text-[13px] text-gray-400">{products.isFetching ? 'Recherche…' : 'Aucun produit libre ne correspond.'}</li>}
        </ul>
      )}
    </div>
  )
}
