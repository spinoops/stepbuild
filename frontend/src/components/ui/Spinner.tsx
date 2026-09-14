interface SpinnerProps {
  label?: string
}

export default function Spinner({ label = 'Chargement…' }: SpinnerProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
      {label}
    </div>
  )
}
