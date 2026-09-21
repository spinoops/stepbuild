import type { ComponentProps, ReactNode } from 'react'
import { Icon } from '@/components/icons'

/** Ligne de formulaire : libellé à gauche (largeur fixe), contrôle(s) à droite. */
export function Field({
  label,
  children,
  labelWidth = 120,
  className = '',
}: {
  label: string
  children: ReactNode
  labelWidth?: number
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="shrink-0 text-[13px] text-gray-500" style={{ width: labelWidth }}>
        {label}
      </span>
      {children}
    </div>
  )
}

/** Titre de section (« Informations documents », « Adresses »). */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{children}</div>
  )
}

const BASE =
  'h-8 rounded-md border border-gray-300 bg-white px-2.5 text-[13px] text-gray-800 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 read-only:bg-gray-50 read-only:text-gray-600 disabled:bg-gray-50 disabled:text-gray-400'

export function BbInput({ className = '', invalid = false, ...props }: ComponentProps<'input'> & { invalid?: boolean }) {
  if (invalid) {
    className = `${className} border-red-400 focus:border-red-500 focus:ring-red-100`
  }
  return <input className={`${BASE} ${className}`} {...props} />
}

export function BbSelect({ className = '', children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={`${BASE} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function BbTextarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={`rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-800 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 ${className}`}
      {...props}
    />
  )
}

export function BbCheckbox({
  label,
  className = '',
  ...props
}: ComponentProps<'input'> & { label?: string }) {
  return (
    <label className={`inline-flex items-center gap-2 text-[13px] text-gray-700 ${className}`}>
      <input type="checkbox" className="h-4 w-4 rounded accent-primary-600" {...props} />
      {label}
    </label>
  )
}

export interface StatusOption {
  value: string
  label: string
  /** Classe de fond (couleur du statut). */
  rowClass: string
}

/** Champ Statut coloré selon la valeur (vert « Adjugé », rouge « En cours »…). */
export function StatusSelect({
  options,
  value,
  onChange,
  className = '',
}: {
  options: StatusOption[]
  value: string
  onChange?: (value: string) => void
  className?: string
}) {
  const current = options.find((option) => option.value === value)
  return (
    <div className={`relative flex items-center rounded-md ${current?.rowClass ?? 'bg-white'} ${className}`}>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-8 flex-1 appearance-none rounded-md border border-gray-300 bg-transparent pl-2.5 pr-8 text-[13px] font-medium text-gray-800 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevrondown" className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-gray-500" />
    </div>
  )
}
