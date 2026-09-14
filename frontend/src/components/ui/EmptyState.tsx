import type { ReactNode } from 'react'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  /** Action proposée (bouton). */
  children?: ReactNode
}

/** État vide d'une liste ou d'un module. */
export default function EmptyState({ icon = 'folder', title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
