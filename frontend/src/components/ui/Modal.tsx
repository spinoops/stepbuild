import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Largeur : fiche courte (md), fenêtre de travail (xl) ou plein écran (full : toute la fenêtre, contenu en colonne). */
  size?: 'md' | 'xl' | 'full'
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full rounded-xl bg-white shadow-lg ${
          size === 'full' ? 'flex h-full max-w-[1700px] flex-col overflow-hidden p-5' : size === 'xl' ? 'max-w-5xl p-6' : 'max-w-md p-6'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
