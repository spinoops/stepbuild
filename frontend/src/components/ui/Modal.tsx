import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {title && <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
