import type { DocumentStatus, DocumentType, ProjectStatus, ReportStatus } from '@/types'

export interface StatusMeta {
  label: string
  /** Code court, tel qu'affiché dans BauBit (utile pour la reprise des données). */
  code: string
  /** Classes Tailwind du badge. */
  className: string
  /** Classes de la ligne de grille et du champ Statut (couleurs BauBit). */
  rowClass: string
}

/** Statuts de projet — même code couleur que la liste des projets BauBit. */
export const PROJECT_STATUSES: Record<ProjectStatus, StatusMeta> = {
  en_cours: { label: 'En cours', code: '1-EC', className: 'bg-amber-100 text-amber-800', rowClass: 'bg-white' },
  adjuge: { label: 'Adjugé', code: '2-ADJ', className: 'bg-green-100 text-green-800', rowClass: 'bg-bb-green' },
  termine: { label: 'Terminé', code: '3-TER', className: 'bg-gray-100 text-gray-700', rowClass: 'bg-bb-grey' },
  refuse: { label: 'Refusé', code: '4-REF', className: 'bg-gray-200 text-gray-600', rowClass: 'bg-bb-dark text-gray-500' },
}

/** Statuts d'un rapport journalier — workflow de validation. */
export const REPORT_STATUSES: Record<ReportStatus, StatusMeta> = {
  en_cours: { label: 'En cours', code: '1-EC', className: 'bg-red-100 text-red-800', rowClass: 'bg-bb-red' },
  en_controle: { label: 'En contrôle', code: '2-CTRL', className: 'bg-amber-100 text-amber-800', rowClass: 'bg-bb-green' },
  facture: { label: 'Facturé en régie', code: '3-FAC', className: 'bg-green-100 text-green-800', rowClass: 'bg-bb-blue-light' },
}

/** Statuts d'un devis. */
export const DOCUMENT_STATUSES: Record<DocumentStatus, StatusMeta> = {
  en_cours: { label: 'En cours', code: '1-EC', className: 'bg-amber-100 text-amber-800', rowClass: 'bg-white' },
  envoye: { label: 'Envoyé', code: '2-ENV', className: 'bg-blue-50 text-blue-700', rowClass: 'bg-bb-blue-light' },
  accepte: { label: 'Accepté', code: '3-ACC', className: 'bg-green-100 text-green-800', rowClass: 'bg-bb-green' },
  refuse: { label: 'Refusé', code: '4-REF', className: 'bg-gray-200 text-gray-600', rowClass: 'bg-bb-dark text-gray-500' },
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  devis: 'Devis',
  acompte: 'Acompte',
  facture: 'Facture',
}
