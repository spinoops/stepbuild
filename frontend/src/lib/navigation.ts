import type { Role } from '@/types'
import type { IconName } from '@/components/icons'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Rôles autorisés (absent = tout utilisateur connecté). */
  roles?: Role[]
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

const GESTION: Role[] = ['admin', 'responsable']

/**
 * Navigation principale, calquée sur les rubans BauBit :
 * Projets / Exécution / Offre-facturation / Données de base / Administration.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Général',
    items: [{ to: '/dashboard', label: 'Tableau de bord', icon: 'dashboard' }],
  },
  {
    title: 'Chantiers',
    items: [
      { to: '/projets', label: 'Projets', icon: 'folder' },
      { to: '/clients', label: 'Clients', icon: 'contacts', roles: GESTION },
    ],
  },
  {
    title: 'Exécution',
    items: [
      { to: '/rapports', label: 'Rapports journaliers', icon: 'clipboard' },
      { to: '/regie', label: 'Régie', icon: 'calculator', roles: GESTION },
      { to: '/controle-heures', label: 'Contrôle des heures', icon: 'clock', roles: GESTION },
    ],
  },
  {
    title: 'Offre & facturation',
    items: [
      { to: '/documents', label: 'Documents', icon: 'file', roles: GESTION },
      { to: '/statistiques', label: 'Statistiques', icon: 'chart', roles: GESTION },
    ],
  },
  {
    title: 'Données de base',
    items: [
      { to: '/catalogue', label: "Catalogue d'articles", icon: 'book', roles: GESTION },
      { to: '/listes-prix', label: 'Listes de prix', icon: 'tag', roles: GESTION },
      { to: '/modeles-devis', label: 'Modèles de devis', icon: 'tree', roles: GESTION },
      { to: '/sous-details-types', label: 'Sous-détails types', icon: 'calculator', roles: GESTION },
      { to: '/collaborateurs', label: 'Collaborateurs', icon: 'users', roles: GESTION },
      { to: '/stock', label: 'Stocks', icon: 'box', roles: ['admin', 'responsable', 'stock'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/users', label: 'Utilisateurs', icon: 'users', roles: ['admin'] },
      { to: '/settings', label: 'Configuration', icon: 'settings', roles: ['admin'] },
    ],
  },
]

/** Libellé d'onglet pour une route (utilisé par les onglets d'espaces de travail). */
export function routeLabel(path: string): string {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((entry) => entry.to === path)
    if (item) {
      return item.label
    }
  }
  return 'Page'
}
