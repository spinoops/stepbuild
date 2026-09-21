import { toast } from '@/lib/toast'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'

type Tone = 'default' | 'danger' | 'primary' | 'success'

const TONES: Record<Tone, string> = {
  default: 'text-gray-600',
  danger: 'text-red-500',
  primary: 'text-primary-600',
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

/** Bouton-icône de barre d'outils. Sans onClick, signale une fonction à venir. */
export function ToolButton({ icon, title, tone = 'default', disabled = false, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick ?? later}
      className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
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
      className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-[13px] text-gray-700 transition hover:bg-gray-50"
    >
      {icon && <Icon name={icon} className="h-4 w-4 text-gray-500" />}
      {label}
      <Icon name="chevrondown" className="h-3 w-3 text-gray-400" />
    </button>
  )
}

/** Bouton d'action principal (« Nouveau projet »). */
export function ToolPrimary({ icon = 'plus', label, onClick }: { icon?: IconName; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick ?? later}
      className="flex h-8 items-center gap-1.5 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white shadow-sm transition hover:bg-accent-700"
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </button>
  )
}

export function ToolSep() {
  return <span className="mx-1.5 h-5 w-px bg-gray-200" />
}

interface StandardToolsProps {
  newLabel?: string
  onNew?: () => void
  /** Enregistre via le formulaire d'identifiant donné (bouton submit externe). */
  formId?: string
  onUndo?: () => void
  onDelete?: () => void
  canDelete?: boolean
}

/** Jeu de boutons standard : nouveau, enregistrer, annuler, supprimer, colonnes, filtre, imprimer. */
export function StandardTools({ newLabel = 'Nouveau', onNew, formId, onUndo, onDelete, canDelete = true }: StandardToolsProps) {
  return (
    <>
      <ToolPrimary label={newLabel} onClick={onNew} />
      <ToolSep />
      {formId ? (
        <button
          type="submit"
          form={formId}
          title="Enregistrer (Ctrl+S)"
          className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-gray-100"
        >
          <Icon name="save" className="h-4 w-4 text-primary-600" />
        </button>
      ) : (
        <ToolButton icon="save" title="Enregistrer" tone="primary" />
      )}
      <ToolButton icon="undo" title="Annuler les modifications" onClick={onUndo} />
      <ToolButton icon="trash" title="Supprimer" tone="danger" onClick={onDelete} disabled={Boolean(onDelete) && !canDelete} />
      <ToolSep />
      <ToolButton icon="table" title="Colonnes" />
      <ToolButton icon="filter" title="Filtre" />
      <ToolButton icon="print" title="Imprimer" />
      <ToolSep />
    </>
  )
}
