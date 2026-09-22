import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Largeur : fiche courte (md) ou fenêtre de travail (xl). */
  size?: 'md' | 'xl'
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
        className={`w-full rounded-xl bg-white p-6 shadow-lg ${size === 'xl' ? 'max-w-5xl' : 'max-w-md'}`}
        onClick={(event) => event.stopPropagation()}
      >
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
