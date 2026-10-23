import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { fmtAmount } from '@/lib/format'
import { Icon } from '@/components/icons'

export type CellValue = string | number | boolean | null | undefined

export interface GridColumn<T> {
  key: string
  header: string
  value: (row: T) => CellValue
  render?: (row: T) => ReactNode
  type?: 'text' | 'number' | 'bool'
  /** Décimales pour les colonnes numériques (2 par défaut). */
  decimals?: number
  width?: number
  align?: 'left' | 'right' | 'center'
  /** En-tête vertical (grille des heures par type de travail). */
  rotate?: boolean
  /** Texte qui passe à la ligne (descriptions longues). */
  wrap?: boolean
  headerClass?: string
  cellClass?: (row: T) => string
  /** Masque la case de filtre pour cette colonne. */
  noFilter?: boolean
}

interface DataGridProps<T> {
  columns: GridColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Classe de la ligne (couleur de statut). Sinon : alternance blanc / gris pâle. */
  rowClass?: (row: T, index: number) => string | undefined
  selectedKey?: string | null
  onSelect?: (row: T) => void
  /** Double-clic sur une ligne (ouvrir, insérer…). */
  onActivate?: (row: T) => void
  showFilter?: boolean
  /** Ligne(s) de pied de tableau (<tr>). */
  footer?: ReactNode
  className?: string
  emptyText?: string
  /** Hauteur (px) des en-têtes verticaux. */
  rotateHeight?: number
  /**
   * Mode serveur : la grille ne filtre ni ne trie elle-même, elle remonte l'état.
   * Les clés de colonnes doivent alors correspondre aux colonnes de l'API.
   */
  query?: GridState
  onQueryChange?: (query: GridState) => void
  /**
   * Clé de mémorisation des largeurs de colonnes réglées à la souris (localStorage, par page).
   * Sans clé, les largeurs réglées ne valent que pour la session de la page.
   */
  storageKey?: string
}

const MIN_WIDTH = 40

/** Pendant le réglage d'une largeur : curseur de redimensionnement et pas de sélection de texte. */
function setBodyResizing(on: boolean): void {
  const style = window.document.body.style
  style.cursor = on ? 'col-resize' : ''
  style.userSelect = on ? 'none' : ''
}

function loadWidths(storageKey: string | undefined): Record<string, number> {
  if (!storageKey) {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(`stepbuild.grid.${storageKey}`)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function saveWidths(storageKey: string | undefined, widths: Record<string, number>): void {
  if (!storageKey) {
    return
  }
  try {
    window.localStorage.setItem(`stepbuild.grid.${storageKey}`, JSON.stringify(widths))
  } catch {
    // stockage indisponible : les largeurs valent pour la session seulement
  }
}

export interface GridState {
  filters: Record<string, string>
  sort: { key: string; dir: 'asc' | 'desc' } | null
}

function normalize(value: CellValue): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Grille de données : en-tête discret, ligne de filtre par colonne (filtrage réel),
 * tri au clic sur l'en-tête, lignes colorées par statut, ligne sélectionnée. Les colonnes se
 * redimensionnent en tirant le bord droit de leur en-tête (double-clic : largeur d'origine).
 */
export default function DataGrid<T>({
  columns,
  rows,
  rowKey,
  rowClass,
  selectedKey,
  onSelect,
  onActivate,
  showFilter = true,
  footer,
  className = '',
  emptyText = 'Aucune entrée.',
  rotateHeight = 96,
  query,
  onQueryChange,
  storageKey,
}: DataGridProps<T>) {
  const [local, setLocal] = useState<GridState>({ filters: {}, sort: null })
  // Largeurs réglées à la souris, par clé de colonne (sinon la largeur déclarée par la colonne).
  const [widths, setWidths] = useState<Record<string, number>>(() => loadWidths(storageKey))
  const resizing = useRef<{ key: string; startX: number; startWidth: number } | null>(null)
  const widthOf = (column: GridColumn<T>) => widths[column.key] ?? column.width

  useEffect(() => {
    const move = (event: MouseEvent) => {
      const current = resizing.current
      if (!current) {
        return
      }
      const width = Math.max(MIN_WIDTH, Math.round(current.startWidth + event.clientX - current.startX))
      setWidths((value) => (value[current.key] === width ? value : { ...value, [current.key]: width }))
    }
    const stop = () => {
      if (!resizing.current) {
        return
      }
      resizing.current = null
      setBodyResizing(false)
      setWidths((value) => {
        saveWidths(storageKey, value)
        return value
      })
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
    }
  }, [storageKey])

  function startResize(event: React.MouseEvent<HTMLSpanElement>, column: GridColumn<T>) {
    event.preventDefault()
    event.stopPropagation()
    const cell = event.currentTarget.parentElement
    // Largeur de départ = largeur réellement affichée (une colonne peut s'être étirée pour remplir la grille).
    resizing.current = { key: column.key, startX: event.clientX, startWidth: cell?.getBoundingClientRect().width ?? widthOf(column) ?? 120 }
    setBodyResizing(true)
  }

  function resetWidth(event: React.MouseEvent<HTMLSpanElement>, column: GridColumn<T>) {
    event.preventDefault()
    event.stopPropagation()
    setWidths((value) => {
      const next = { ...value }
      delete next[column.key]
      saveWidths(storageKey, next)
      return next
    })
  }
  const controlled = Boolean(query && onQueryChange)
  const { filters, sort } = controlled ? query! : local

  function update(next: GridState) {
    if (controlled) {
      onQueryChange!(next)
    } else {
      setLocal(next)
    }
  }

  const visible = useMemo(() => {
    if (controlled) {
      return rows
    }
    const factor = sort?.dir === 'desc' ? -1 : 1
    let result = rows.filter((row) =>
      columns.every((column) => {
        const filter = filters[column.key]
        if (!filter) {
          return true
        }
        return normalize(column.value(row)).includes(normalize(filter))
      }),
    )
    if (sort) {
      const column = columns.find((item) => item.key === sort.key)
      if (column) {
        result = [...result].sort((a, b) => {
          const va = column.value(a)
          const vb = column.value(b)
          if (typeof va === 'number' && typeof vb === 'number') {
            return (va - vb) * factor
          }
          return normalize(va).localeCompare(normalize(vb)) * factor
        })
      }
    }
    return result
  }, [rows, columns, filters, sort, controlled])

  const hasFilters = Object.values(filters).some(Boolean)

  function toggleSort(key: string) {
    const next: GridState['sort'] =
      !sort || sort.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null
    update({ filters, sort: next })
  }

  function renderCell(column: GridColumn<T>, row: T): ReactNode {
    if (column.render) {
      return column.render(row)
    }
    const value = column.value(row)
    if (column.type === 'bool') {
      return value ? (
        <Icon name="check" className="mx-auto h-4 w-4 text-green-600" />
      ) : (
        <span className="mx-auto block h-4 w-4 rounded border border-gray-300" />
      )
    }
    if (column.type === 'number') {
      return typeof value === 'number' ? fmtAmount(value, column.decimals ?? 2) : ''
    }
    return value === null || value === undefined ? '' : String(value)
  }

  const align = (column: GridColumn<T>) =>
    column.align === 'right'
      ? 'text-right'
      : column.align === 'center' || column.type === 'bool'
        ? 'text-center'
        : column.type === 'number'
          ? 'text-right'
          : 'text-left'

  return (
    <div className={`overflow-auto ${className}`}>
      <table className="w-max min-w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="w-1 border-b border-gray-200 bg-bb-ribbon" />
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => toggleSort(column.key)}
                style={{ width: widthOf(column), minWidth: widthOf(column), maxWidth: widths[column.key] }}
                className={`relative cursor-pointer select-none border-b border-gray-200 bg-bb-ribbon px-3 text-[12px] font-semibold text-gray-500 transition hover:text-gray-800 ${
                  column.rotate ? 'align-bottom' : 'h-9 overflow-hidden whitespace-nowrap'
                } ${column.headerClass ?? ''} ${column.rotate ? 'text-center' : align(column)}`}
              >
                <span
                  onMouseDown={(event) => startResize(event, column)}
                  onDoubleClick={(event) => resetWidth(event, column)}
                  onClick={(event) => event.stopPropagation()}
                  title="Tirer pour régler la largeur de la colonne (double-clic : largeur d'origine)"
                  className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize hover:bg-primary-300/60"
                />
                {column.rotate ? (
                  <div className="mx-auto flex items-end pb-1" style={{ height: rotateHeight }}>
                    <span className="bb-vertical whitespace-nowrap text-left font-medium">{column.header}</span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {sort?.key === column.key && (
                      <Icon name="chevrondown" className={`h-3 w-3 ${sort.dir === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </span>
                )}
              </th>
            ))}
          </tr>
          {showFilter && (
            <tr>
              <th className={`border-b border-gray-200 ${hasFilters ? 'bg-primary-50' : 'bg-white'}`} />
              {columns.map((column) => (
                <th key={column.key} className="border-b border-gray-200 bg-white px-1.5 py-1 font-normal">
                  {column.noFilter || column.type === 'bool' ? null : (
                    <input
                      value={filters[column.key] ?? ''}
                      onChange={(event) => update({ filters: { ...filters, [column.key]: event.target.value }, sort })}
                      aria-label={`Filtrer ${column.header}`}
                      placeholder={column.rotate ? '' : 'Filtrer…'}
                      className={`h-7 w-full min-w-6 rounded-md border px-2 text-[12px] outline-none transition placeholder:text-gray-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 ${
                        filters[column.key] ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  )}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {visible.map((row, index) => {
            const key = rowKey(row)
            const selected = key === selectedKey
            const cls = rowClass?.(row, index) ?? (index % 2 ? 'bg-bb-row' : 'bg-white')
            return (
              <tr
                key={key}
                onClick={() => onSelect?.(row)}
                onDoubleClick={() => onActivate?.(row)}
                className={`cursor-default transition ${selected ? 'bg-primary-50' : `${cls} hover:brightness-[0.97]`}`}
              >
                <td className={`w-1 border-b border-gray-100 ${selected ? 'bg-primary-600' : ''}`} />
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`border-b border-gray-100 px-3 py-1.5 align-top ${align(column)} ${
                      column.wrap ? 'whitespace-normal' : 'overflow-hidden text-ellipsis whitespace-nowrap'
                    } ${column.cellClass?.(row) ?? ''}`}
                    style={column.wrap || widths[column.key] !== undefined ? { maxWidth: widthOf(column) } : undefined}
                    title={!column.wrap && widths[column.key] !== undefined && !column.render ? String(column.value(row) ?? '') : undefined}
                  >
                    {renderCell(column, row)}
                  </td>
                ))}
              </tr>
            )
          })}
          {visible.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="p-8 text-center text-gray-400">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
        {footer && <tfoot className="sticky bottom-0 z-10 bg-bb-ribbon font-medium">{footer}</tfoot>}
      </table>
    </div>
  )
}
