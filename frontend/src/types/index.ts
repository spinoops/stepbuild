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

export type AddressType = 'client' | 'fournisseur' | 'sous_traitant' | 'contact'

/** Adresse du carnet centralisé (GET /api/addresses). */
export interface Address {
  id: number
  type: AddressType
  title: string | null
  last_name: string
  first_name: string | null
  designation: string | null
  street: string | null
  street_no: string | null
  po_box: string | null
  country: string | null
  zip: string | null
  city: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  debtor_no: string | null
  remark: string | null
  is_active: boolean
  updated_at: string
}

/** Chapitre du catalogue = modèle d'étape pour les devis. */
export interface CatalogChapter {
  id: number
  parent_id: number | null
  code: string
  label: string
  position: number
  articles_count?: number
}

export interface CatalogArticle {
  id: number
  catalog_chapter_id: number
  chapter_code?: string | null
  code: string | null
  sub_code: string | null
  description: string
  unit: string | null
  purchase_price: number | null
  sale_price: number | null
  work_type: string | null
  category: string | null
  is_title: boolean
  usage_count: number
  updated_at: string
}

export interface PriceElement {
  id: number
  family: number
  group_code: string | null
  number: string
  description: string
  unit: string | null
  unit_regie: string | null
  supplier_price: number | null
  net_price: number | null
  regie_price: number | null
  regie_code: string | null
  unit_factor: number
  discount_amount: number | null
  discount_percent: number | null
  usage_count: number
  updated_at: string
}

/** Réponse de GET /api/search. */
export interface SearchGroup {
  key: string
  title: string
  path: string
  items: { id: number; label: string; sublabel: string }[]
}

export interface SearchResponse {
  query: string
  groups: SearchGroup[]
  took_ms: number
}
