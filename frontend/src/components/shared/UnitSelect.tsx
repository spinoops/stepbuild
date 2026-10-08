import { forwardRef } from 'react'
import type { ComponentProps } from 'react'
import { useUnits } from '@/hooks/useUnits'

interface UnitSelectProps extends ComponentProps<'select'> {
  /** Valeur déjà enregistrée (ancienne unité libre) : proposée même si elle n'est plus dans la liste. */
  extra?: string | null
}

/**
 * Liste déroulante des unités de mesure gérées dans les réglages. Une valeur absente de la liste
 * (données reprises de BauBit, unité désactivée) reste proposée pour ne rien perdre.
 * Utilisable contrôlé (value/onChange) ou avec react-hook-form (register).
 */
const UnitSelect = forwardRef<HTMLSelectElement, UnitSelectProps>(function UnitSelect({ extra, className = '', value, ...props }, ref) {
  const units = useUnits()
  const list = units.data ?? []
  const current = typeof value === 'string' ? value : (extra ?? '')
  const known = list.some((unit) => unit.code === current)

  return (
    // Remonté quand la liste arrive : react-hook-form réapplique alors la valeur du formulaire.
    <select key={units.data ? 'loaded' : 'loading'} ref={ref} value={value} className={className} {...props}>
      <option value="">—</option>
      {current && !known && <option value={current}>{current}</option>}
      {list.map((unit) => (
        <option key={unit.id} value={unit.code} title={unit.label ?? undefined}>
          {unit.code}
        </option>
      ))}
    </select>
  )
})

export default UnitSelect
