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
  /** Classe de la ligne (couleur de statut). Sinon : alternance blanc / jaune pâle. */
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
}

function normalize(value: CellValue): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Grille « façon BauBit » : en-tête bleu, ligne de filtre jaune (filtrage réel),
 * tri au clic sur l'en-tête, lignes alternées ou colorées par statut, ligne sélectionnée.
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
  rotateHeight = 90,
}: DataGridProps<T>) {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)

  const visible = useMemo(() => {
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
            return (va - vb) * sort.dir
          }
          return normalize(va).localeCompare(normalize(vb)) * sort.dir
        })
      }
    }
    return result
  }, [rows, columns, filters, sort])

  function toggleSort(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) {
        return { key, dir: 1 }
      }
      return current.dir === 1 ? { key, dir: -1 } : null
    })
  }

  function renderCell(column: GridColumn<T>, row: T): ReactNode {
    if (column.render) {
      return column.render(row)
    }
    const value = column.value(row)
    if (column.type === 'bool') {
      return (
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center border border-gray-500 bg-white text-[10px] leading-none">
          {value ? '✓' : ''}
        </span>
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
      <table className="w-max min-w-full border-collapse text-[12px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#f4f4f4]">
            <th className="w-5 border-b border-r border-bb-line bg-[#f4f4f4]" />
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => toggleSort(column.key)}
                style={{ width: column.width, minWidth: column.width }}
                className={`cursor-pointer select-none border-b border-r border-bb-line bg-[#f4f4f4] px-1.5 font-normal text-bb-head hover:bg-[#e9eef5] ${
                  column.rotate ? 'align-bottom' : 'h-6 whitespace-nowrap'
                } ${column.headerClass ?? ''} ${column.rotate ? 'text-center' : align(column)}`}
              >
                {column.rotate ? (
                  <div className="mx-auto flex items-end" style={{ height: rotateHeight }}>
                    <span className="bb-vertical whitespace-nowrap text-left">{column.header}</span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {sort?.key === column.key && (
                      <Icon name="chevrondown" className={`h-3 w-3 ${sort.dir === -1 ? 'rotate-180' : ''}`} />
                    )}
                  </span>
                )}
              </th>
            ))}
          </tr>
          {showFilter && (
            <tr className="bg-bb-yellow">
              <th className="border-b border-r border-bb-line bg-bb-yellow">
                <Icon name="filter" className="mx-auto h-3 w-3 text-bb-blue" />
              </th>
              {columns.map((column) => (
                <th key={column.key} className="h-6 border-b border-r border-bb-line bg-bb-yellow px-1 font-normal">
                  {column.noFilter ? null : column.type === 'bool' ? (
                    <span className="mx-auto block h-3 w-3 border border-gray-500 bg-white" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="shrink-0 border border-gray-400 bg-white px-0.5 text-[9px] leading-[11px] text-gray-600">
                        {column.type === 'number' ? '=' : 'abc'}
                      </span>
                      <input
                        value={filters[column.key] ?? ''}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, [column.key]: event.target.value }))
                        }
                        aria-label={`Filtrer ${column.header}`}
                        className="w-full min-w-5 bg-transparent text-[12px] outline-none"
                      />
                    </div>
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
                className={`cursor-default ${cls} ${selected ? 'outline -outline-offset-1 outline-bb-blue' : ''}`}
              >
                <td className="border-b border-r border-bb-line text-center text-[10px] text-gray-600">
                  {selected ? '▶' : ''}
                </td>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`border-b border-r border-bb-line px-1.5 py-0.5 align-top ${align(column)} ${
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
              <td colSpan={columns.length + 1} className="p-4 text-center text-gray-500">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
        {footer && <tfoot className="sticky bottom-0 z-10 bg-[#f4f4f4]">{footer}</tfoot>}
      </table>
    </div>
  )
}
