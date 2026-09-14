import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Icon } from '@/components/icons'

/** Ligne de formulaire : libellé à gauche (largeur fixe), contrôle(s) à droite. */
export function Field({
  label,
  children,
  labelWidth = 110,
  className = '',
}: {
  label: string
  children: ReactNode
  labelWidth?: number
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="shrink-0 text-gray-700" style={{ width: labelWidth }}>
        {label}
      </span>
      {children}
    </div>
  )
}

/** Titre de section bleu souligné (« Informations documents », « Adresses »). */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-2 border-b border-gray-400 pb-0.5 text-[12px] font-bold text-bb-head">{children}</div>
}

const BASE =
  'h-[22px] border border-[#b9b9b9] bg-white px-1.5 text-[12px] outline-none focus:border-bb-blue read-only:bg-[#f7f7f7] disabled:bg-[#f3f3f3] disabled:text-gray-500'

export function BbInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${BASE} ${className}`} {...props} />
}

export function BbSelect({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${BASE} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function BbTextarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`border border-[#b9b9b9] bg-white px-1.5 py-1 text-[12px] outline-none focus:border-bb-blue ${className}`}
      {...props}
    />
  )
}

export function BbCheckbox({
  label,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <input type="checkbox" className="h-3.5 w-3.5 accent-bb-blue" {...props} />
      {label}
    </label>
  )
}

export interface StatusOption {
  value: string
  label: string
  /** Classe de fond (couleur BauBit du statut). */
  rowClass: string
}

/** Champ Statut coloré selon la valeur (vert « 2-ADJ », rouge « 1-EC »…). */
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
    <div className={`relative flex items-center ${current?.rowClass ?? 'bg-white'} ${className}`}>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-[22px] flex-1 appearance-none border border-[#b9b9b9] bg-transparent pl-1.5 pr-10 text-[12px] outline-none focus:border-bb-blue"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevrondown" className="pointer-events-none absolute right-6 h-3 w-3 text-gray-600" />
      <Icon name="clock" className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-bb-blue" />
    </div>
  )
}
