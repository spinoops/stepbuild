import { useMemo, useState } from 'react'
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
 * tri au clic sur l'en-tête, lignes colorées par statut, ligne sélectionnée.
 */
export default function DataGrid<T>({
  columns,
  rows,
  rowKey,
  rowClass,
  selectedKey,
  onSelect,
  showFilter = true,
  footer,
  className = '',
  emptyText = 'Aucune entrée.',
  rotateHeight = 96,
  query,
  onQueryChange,
}: DataGridProps<T>) {
  const [local, setLocal] = useState<GridState>({ filters: {}, sort: null })
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
                style={{ width: column.width, minWidth: column.width }}
                className={`cursor-pointer select-none border-b border-gray-200 bg-bb-ribbon px-3 text-[12px] font-semibold text-gray-500 transition hover:text-gray-800 ${
                  column.rotate ? 'align-bottom' : 'h-9 whitespace-nowrap'
                } ${column.headerClass ?? ''} ${column.rotate ? 'text-center' : align(column)}`}
              >
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
                className={`cursor-default transition ${selected ? 'bg-primary-50' : `${cls} hover:brightness-[0.97]`}`}
              >
                <td className={`w-1 border-b border-gray-100 ${selected ? 'bg-primary-600' : ''}`} />
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`border-b border-gray-100 px-3 py-1.5 align-top ${align(column)} ${
                      column.wrap ? 'whitespace-normal' : 'whitespace-nowrap'
                    } ${column.cellClass?.(row) ?? ''}`}
                    style={column.wrap ? { maxWidth: column.width } : undefined}
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
