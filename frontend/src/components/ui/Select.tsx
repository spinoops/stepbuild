import type { SelectHTMLAttributes } from 'react'
import { forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className = '', id, children, ...props },
  ref,
) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-1 ${
          error
            ? 'border-red-400 focus:ring-red-500'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
})

export default Select
