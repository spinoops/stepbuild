import { toast } from '@/lib/toast'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'

type Tone = 'default' | 'danger' | 'primary' | 'success'

const TONES: Record<Tone, string> = {
  default: 'text-gray-700',
  danger: 'text-red-600',
  primary: 'text-bb-blue',
  success: 'text-green-600',
}

interface ToolButtonProps {
  icon: IconName
  title: string
  tone?: Tone
  disabled?: boolean
  onClick?: () => void
}

function later() {
  toast('Fonction disponible dans une phase ultérieure.', 'info')
}

/** Petit bouton-icône de barre d'outils. Sans onClick, signale une fonction à venir. */
export function ToolButton({ icon, title, tone = 'default', disabled = false, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick ?? later}
      className="flex h-6 w-6 items-center justify-center rounded hover:bg-blue-50 disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Icon name={icon} className={`h-4 w-4 ${TONES[tone]}`} />
    </button>
  )
}

interface ToolMenuProps {
  icon?: IconName
  label: string
  onClick?: () => void
}

/** Bouton-menu (« Import ▾ », « Export ▾ », « Extras ▾ »). */
export function ToolMenu({ icon, label, onClick }: ToolMenuProps) {
  return (
    <button
      type="button"
      onClick={onClick ?? later}
      className="flex h-6 items-center gap-1 rounded px-1.5 text-[12px] hover:bg-blue-50"
    >
      {icon && <Icon name={icon} className="h-4 w-4 text-primary-700" />}
      {label}
      <Icon name="chevrondown" className="h-3 w-3 text-gray-500" />
    </button>
  )
}

export function ToolSep() {
  return <span className="mx-1 h-5 w-px bg-bb-line" />
}

/** Jeu de boutons standard (supprimer, nouveau, enregistrer, annuler, colonnes, filtre, imprimer). */
export function StandardTools() {
  return (
    <>
      <ToolButton icon="close" title="Supprimer" tone="danger" />
      <ToolButton icon="fileplus" title="Nouveau" />
      <ToolButton icon="save" title="Enregistrer" tone="primary" />
      <ToolButton icon="undo" title="Annuler les modifications" tone="danger" />
      <ToolSep />
      <ToolButton icon="table" title="Colonnes" tone="primary" />
      <ToolButton icon="sliders" title="Disposition" tone="primary" />
      <ToolButton icon="filter" title="Filtre" tone="primary" />
      <ToolSep />
      <ToolButton icon="print" title="Imprimer" />
      <ToolButton icon="search" title="Aperçu avant impression" />
      <ToolSep />
    </>
  )
}
