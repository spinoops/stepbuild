import type { HTMLAttributes } from 'react'

type Tone = 'gray' | 'primary' | 'green' | 'amber' | 'red' | 'blue'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const TONES: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-600',
  primary: 'bg-primary-50 text-primary-700',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-50 text-blue-700',
}

/** Pastille de statut / d'étiquette. Passe `className` pour une couleur sur mesure. */
export default function Badge({ tone = 'gray', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
