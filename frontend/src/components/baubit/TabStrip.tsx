interface TabStripProps {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
  className?: string
}

/** Onglets soulignés (Général | Compléments | Adresses…). */
export default function TabStrip({ tabs, active, onChange, className = '' }: TabStripProps) {
  return (
    <div className={`flex items-end gap-1 overflow-x-auto border-b border-gray-200 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`-mb-px h-9 whitespace-nowrap border-b-2 px-3 text-[13px] transition ${
            tab === active
              ? 'border-primary-600 font-medium text-primary-700'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
