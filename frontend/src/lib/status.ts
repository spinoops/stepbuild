import type { ProjectStatus, ReportStatus } from '@/types'

export interface StatusMeta {
  label: string
  /** Code court, tel qu'affiché dans BauBit (utile pour la reprise des données). */
  code: string
  /** Classes Tailwind du badge / de la ligne colorée. */
  className: string
}

/** Statuts de projet — même code couleur que la liste des projets BauBit. */
export const PROJECT_STATUSES: Record<ProjectStatus, StatusMeta> = {
  en_cours: { label: 'En cours', code: '1-EC', className: 'bg-amber-100 text-amber-800' },
  adjuge: { label: 'Adjugé', code: '2-ADJ', className: 'bg-green-100 text-green-800' },
  termine: { label: 'Terminé', code: '3-TER', className: 'bg-gray-100 text-gray-700' },
  refuse: { label: 'Refusé', code: '4-REF', className: 'bg-gray-700 text-gray-100' },
}

/** Statuts d'un rapport journalier — workflow de validation. */
export const REPORT_STATUSES: Record<ReportStatus, StatusMeta> = {
  en_cours: { label: 'En cours', code: '1-EC', className: 'bg-red-100 text-red-800' },
  en_controle: { label: 'En contrôle', code: '2-CTRL', className: 'bg-amber-100 text-amber-800' },
  facture: { label: 'Facturé en régie', code: '3-FAC', className: 'bg-green-100 text-green-800' },
}
