import type { ReactNode } from 'react'
import { Icon } from '@/components/icons'

interface AccordionProps {
  title: string
  open: boolean
  onToggle: () => void
  /** Complément à droite du titre (compteur, état). */
  badge?: ReactNode
  /** Le contenu défile dans sa propre zone ; les sections ouvertes se partagent la hauteur du panneau. */
  children: ReactNode
}

/**
 * Section dépliable d'un panneau latéral. Plusieurs sections ouvertes se partagent la hauteur ;
 * une section fermée ne garde que son titre.
 */
export default function Accordion({ title, open, onToggle, badge, children }: AccordionProps) {
  return (
    <section className={`flex flex-col border-t border-gray-200 first:border-t-0 ${open ? 'min-h-0 flex-1' : 'shrink-0'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex h-9 shrink-0 items-center gap-1.5 px-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-50 hover:text-gray-800"
      >
        <Icon name="chevron" className={`h-3.5 w-3.5 text-gray-400 transition ${open ? 'rotate-90' : ''}`} />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {badge !== undefined && <span className="shrink-0 text-[11px] font-normal normal-case tracking-normal text-gray-400">{badge}</span>}
      </button>
      {open && <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">{children}</div>}
    </section>
  )
}
