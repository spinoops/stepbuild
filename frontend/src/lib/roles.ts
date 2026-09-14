import type { Role, User } from '@/types'

export const ROLES: Role[] = ['admin', 'responsable', 'ouvrier']

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  responsable: 'Responsable',
  ouvrier: 'Ouvrier',
}

/** Classes Tailwind du badge de rôle. */
export const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-primary-50 text-primary-700',
  responsable: 'bg-blue-50 text-blue-700',
  ouvrier: 'bg-gray-100 text-gray-600',
}

/** L'utilisateur possède-t-il au moins un des rôles demandés ? (aucun rôle demandé = autorisé) */
export function hasRole(user: User | null | undefined, roles?: Role[]): boolean {
  if (!roles || roles.length === 0) {
    return true
  }
  return Boolean(user?.roles.some((role) => roles.includes(role)))
}

/** Rôle principal affiché (le premier). */
export function primaryRole(user: User | null | undefined): Role | null {
  return user?.roles[0] ?? null
}

/** Les prix, marges et montants sont réservés aux admins et responsables. */
export function canSeePrices(user: User | null | undefined): boolean {
  return hasRole(user, ['admin', 'responsable'])
}
