import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  /** Actions affichées à droite (boutons). */
  children?: ReactNode
}

/** En-tête standard d'une page : titre, description, actions. */
export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
