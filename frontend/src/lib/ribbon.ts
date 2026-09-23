import type { Role } from '@/types'
import type { IconName } from '@/components/icons'

export interface RibbonItem {
  label: string
  icon: IconName
  /** Route ouverte au clic. Absent = fonction pas encore disponible (bouton grisé). */
  to?: string
  /** Gros bouton (icône 32 px, libellé dessous). */
  big?: boolean
  roles?: Role[]
}

export interface RibbonGroup {
  title: string
  items: RibbonItem[]
}

export interface RibbonTab {
  id: string
  label: string
  groups: RibbonGroup[]
}

const GESTION: Role[] = ['admin', 'responsable']

/**
 * Ruban calqué sur BauBit PRO : Offre facturation / Exécution / Services centraux /
 * Données de base / Administration. Les boutons sans `to` correspondent à des
 * fonctions prévues dans une phase ultérieure.
 */
export const RIBBON_TABS: RibbonTab[] = [
  {
    id: 'accueil',
    label: 'Accueil',
    groups: [
      { title: 'Général', items: [{ label: 'Tableau de bord', icon: 'dashboard', to: '/dashboard', big: true }] },
      {
        title: 'Raccourcis',
        items: [
          { label: 'Projets', icon: 'folder', to: '/projets' },
          { label: 'Rapports journaliers', icon: 'clipboard', to: '/rapports' },
          { label: 'Documents', icon: 'file', to: '/documents', roles: GESTION },
        ],
      },
    ],
  },
  {
    id: 'offre',
    label: 'Offre facturation',
    groups: [
      { title: 'Projets', items: [{ label: 'Projets', icon: 'home', to: '/projets', big: true }] },
      {
        title: 'Documents',
        items: [
          { label: 'Explorateur documents', icon: 'folder', to: '/documents', roles: GESTION },
          { label: 'Nouveau document', icon: 'fileplus', roles: GESTION },
          { label: 'Modifier document', icon: 'edit', roles: GESTION },
          { label: 'Effacer document', icon: 'close', roles: GESTION },
          { label: 'Imprimer document', icon: 'print', roles: GESTION },
          { label: 'Modifications globales', icon: 'sliders', roles: GESTION },
          { label: 'Tables diverses', icon: 'table', roles: GESTION },
        ],
      },
      {
        title: 'Divers',
        items: [
          { label: 'Import', icon: 'import', roles: GESTION },
          { label: 'Export', icon: 'export', roles: GESTION },
        ],
      },
    ],
  },
  {
    id: 'execution',
    label: 'Exécution',
    groups: [
      {
        title: 'Planning ressources',
        items: [
          { label: 'Planning projet', icon: 'calendar', roles: GESTION },
          { label: 'Planning collaborateurs', icon: 'users', roles: GESTION },
          { label: 'Planning engins', icon: 'truck', roles: GESTION },
        ],
      },
      {
        title: 'Controlling',
        items: [
          { label: 'Rapports journaliers', icon: 'clipboard', to: '/rapports' },
          { label: 'Explorateur rapports journaliers', icon: 'search', roles: GESTION },
          { label: 'Rapport collaborateur', icon: 'user', roles: GESTION },
          { label: 'Evaluations', icon: 'chart', to: '/statistiques', roles: GESTION },
          { label: 'Contrôle des heures', icon: 'clock', to: '/controle-heures', roles: GESTION },
          { label: 'Aperçu mensuel projet', icon: 'calendar', roles: GESTION },
        ],
      },
      {
        title: 'Régie',
        items: [
          { label: 'Rapports régie', icon: 'calculator', to: '/regie', roles: GESTION },
          { label: 'Tables diverses', icon: 'table', roles: GESTION },
        ],
      },
    ],
  },
  {
    id: 'services',
    label: 'Services centraux',
    groups: [
      { title: 'Adresses', items: [{ label: 'Adresses', icon: 'contacts', to: '/clients', big: true, roles: GESTION }] },
      {
        title: 'Evaluations',
        items: [
          { label: 'Statistiques', icon: 'chart', to: '/statistiques', roles: GESTION },
          { label: 'Suivi de facturation', icon: 'file', to: '/statistiques', roles: GESTION },
          { label: 'Synthèse employés', icon: 'users', to: '/statistiques', roles: GESTION },
        ],
      },
    ],
  },
  {
    id: 'donnees',
    label: 'Données de base',
    groups: [
      { title: 'Catalogue', items: [{ label: "Catalogue d'articles", icon: 'book', to: '/catalogue', big: true, roles: GESTION }] },
      {
        title: 'Devis',
        items: [
          { label: 'Modèles de devis', icon: 'tree', to: '/modeles-devis', roles: GESTION },
          { label: 'Sous-détails types', icon: 'calculator', to: '/sous-details-types', roles: GESTION },
        ],
      },
      {
        title: 'Listes de prix',
        items: [
          { label: 'Eléments de coûts', icon: 'tag', to: '/listes-prix', roles: GESTION },
          { label: 'Tarifs régie', icon: 'calculator', to: '/listes-prix', roles: GESTION },
          { label: 'Types de travail', icon: 'table', roles: GESTION },
          { label: 'Collaborateurs', icon: 'users', to: '/collaborateurs', roles: GESTION },
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    groups: [
      {
        title: 'Système',
        items: [
          { label: 'Utilisateurs', icon: 'users', to: '/users', big: true, roles: ['admin'] },
          { label: 'Configuration', icon: 'settings', to: '/settings', big: true, roles: ['admin'] },
          { label: "Journal d'activité", icon: 'clipboard', roles: ['admin'] },
        ],
      },
    ],
  },
]

/** Onglet du ruban correspondant à une route (pour la sélection automatique). */
export function ribbonTabForPath(path: string): string {
  for (const tab of RIBBON_TABS) {
    if (tab.id === 'accueil') {
      continue
    }
    if (tab.groups.some((group) => group.items.some((item) => item.to === path))) {
      return tab.id
    }
  }
  return 'accueil'
}
