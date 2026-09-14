/** Rôles applicatifs (cf. seeder backend). */
export type Role = 'admin' | 'responsable' | 'ouvrier'

export interface User {
  id: number
  name: string
  email: string
  roles: Role[]
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

/** Réponse de POST /api/login */
export interface LoginResponse {
  token: string
  user: User
}

/** Réglages d'identité de l'app (GET /api/settings). */
export interface AppSettings {
  app_name: string
  app_logo_url: string
  app_color: string
}

/** Enveloppe des listes paginées renvoyées par l'API (Laravel Resource). */
export interface Paginated<T> {
  data: T[]
  links: { first: string | null; last: string | null; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

/** Statuts d'un projet (chantier) — équivalents BauBit : 1-EC, 2-ADJ, 3-TER, 4-REFUSÉ. */
export type ProjectStatus = 'en_cours' | 'adjuge' | 'termine' | 'refuse'

/** Workflow d'un rapport journalier : en cours → en contrôle → facturé en régie. */
export type ReportStatus = 'en_cours' | 'en_controle' | 'facture'
