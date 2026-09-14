import { useEffect, useState } from 'react'
import type { Toast } from '@/lib/toast'
import { dismiss, subscribe } from '@/lib/toast'

const COLORS: Record<Toast['type'], string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-gray-800',
}

export default function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => subscribe(setItems), [])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => dismiss(item.id)}
          className={`max-w-xs rounded-lg px-4 py-2 text-left text-sm text-white shadow-lg ${COLORS[item.type]}`}
        >
          {item.message}
        </button>
      ))}
    </div>
  )
}
