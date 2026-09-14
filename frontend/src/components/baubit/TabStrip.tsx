interface TabStripProps {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
  className?: string
}

/** Onglets « boîtes » façon BauBit (Général | Compléments | Adresses…). */
export default function TabStrip({ tabs, active, onChange, className = '' }: TabStripProps) {
  return (
    <div className={`flex items-end border-b border-bb-line px-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`-mb-px h-6 whitespace-nowrap border border-bb-line px-2 text-[12px] ${
            tab === active ? 'border-b-white bg-white' : 'bg-[#ececec] text-gray-700 hover:bg-[#f5f5f5]'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
