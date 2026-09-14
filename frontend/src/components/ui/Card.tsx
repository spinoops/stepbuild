import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  /** Contenu à droite du titre (badge, bouton…). */
  aside?: ReactNode
  /** Supprime le padding interne (pour les tableaux pleine largeur). */
  flush?: boolean
}

/** Panneau blanc standard. */
export default function Card({
  title,
  aside,
  flush = false,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}
      {...props}
    >
      {(title || aside) && (
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
          {aside}
        </div>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </div>
  )
}
