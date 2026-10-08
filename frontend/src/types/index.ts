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
  /** Réglages de régie (gestion seulement) : majoration des fournitures (%), heures d'une journée. */
  regie_markup_percent?: string
  work_day_hours?: string
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
  /** Date du dernier changement de prix (AAAA-MM-JJ). */
  price_updated_at: string | null
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

/** Projet = chantier (GET /api/projects). `addresses` et `photos` ne sont présents que sur la fiche détaillée. */
export interface Project {
  id: number
  number: string
  designation1: string
  designation2: string | null
  client_id: number | null
  client?: { id: number; label: string; city: string | null; phone: string | null; email: string | null } | null
  status: ProjectStatus
  is_active: boolean
  is_template: boolean
  street: string | null
  street_no: string | null
  zip: string | null
  city: string | null
  country: string | null
  phone: string | null
  mobile: string | null
  contract_no: string | null
  cost_unit: string | null
  invoice_instructions: string | null
  remark: string | null
  cover_url?: string | null
  addresses?: ProjectAddress[]
  photos?: ProjectPhoto[]
  updated_at: string
}

/** Adresse nommée d'un projet (facturation, architecte, accès…). */
export interface ProjectAddress {
  id: number
  project_id: number
  label: string
  address_id: number | null
  name: string | null
  street: string | null
  street_no: string | null
  zip: string | null
  city: string | null
  phone: string | null
  email: string | null
  remark: string | null
  position: number
}

export interface ProjectPhoto {
  id: number
  project_id: number
  /** Lien signé temporaire (6 h). */
  url: string
  original_name: string
  size: number
  caption: string | null
  position: number
}

export type DocumentType = 'devis' | 'acompte' | 'facture'
export type DocumentStatus = 'en_cours' | 'envoye' | 'accepte' | 'refuse'

/** Position d'un devis : article chiffré, sous-titre ou texte libre. */
/** Sous-détail de prix type (bibliothèque d'ouvrages du métreur). */
export interface BreakdownTemplateLine {
  id: number
  family: number
  price_element_id: number | null
  label: string
  unit: string | null
  quantity: number
  per_dimension: boolean
  pack_size: number | null
  unit_cost: number
  markup_percent: number
  note: string | null
}

export interface BreakdownTemplate {
  id: number
  group: string | null
  name: string
  catalog_article_id: number | null
  dimension: number | null
  dimension_unit: string | null
  price_per_dimension: boolean
  note: string | null
  usage_count: number
  lines_count?: number
  lines?: BreakdownTemplateLine[]
  updated_at: string
}

/** Ligne du sous-détail de prix d'une position (famille MO, MAT, MACH, MAT EX, OUT, ST). */
export interface PositionCost {
  id: number
  family: number
  price_element_id: number | null
  label: string
  unit: string | null
  quantity: number
  per_dimension: boolean
  pack_size: number | null
  unit_cost: number
  markup_percent: number
  cost: number
  sale: number
  note: string | null
}

export interface DocumentPosition {
  id: number
  document_step_id: number
  catalog_article_id: number | null
  kind: 'item' | 'title' | 'text'
  code: string | null
  description: string
  unit: string | null
  quantity: number | null
  unit_price: number | null
  cost_price: number | null
  amount: number | null
  is_optional: boolean
  internal_remark: string | null
  /** Sous-détail de prix : dimension de référence (9 m²), prix ramené à cette dimension, prix calculé. */
  dimension: number | null
  dimension_unit: string | null
  price_per_dimension: boolean
  calculated_price: number | null
  costs: PositionCost[]
  position: number
}

/** Étape d'un devis = étape du chantier (reprise par les rapports, la régie, la facture). */
export interface DocumentStep {
  id: number
  document_id: number
  catalog_chapter_id: number | null
  code: string
  label: string
  position: number
  total: number
  positions: DocumentPosition[]
}

/** Document commercial. `steps` n'est présent que sur le document complet. */
export interface DocumentDetail {
  id: number
  project_id: number
  project?: { id: number; number: string; designation1: string }
  type: DocumentType
  sequence: number
  number: string
  title: string | null
  date: string
  status: DocumentStatus
  address_id: number | null
  recipient_title: string | null
  recipient_name: string | null
  recipient_first_name: string | null
  recipient_street: string | null
  recipient_street_no: string | null
  recipient_zip: string | null
  recipient_city: string | null
  recipient_email: string | null
  user_id: number | null
  initials: string | null
  header_text: string | null
  footer_text: string | null
  vat_rate: number
  discount_percent: number | null
  total_net: number
  discount_amount: number
  total_vat: number
  rounding: number
  total_gross: number
  steps?: DocumentStep[]
  updated_at: string
}

/** Étape d'un modèle de devis (chapitre du catalogue ou étape libre). */
export interface QuoteTemplateStep {
  id: number
  catalog_chapter_id: number | null
  code: string
  label: string
  with_articles: boolean
  position: number
}

/** Modèle de devis : jeu d'étapes appliqué à la création d'un devis. */
export interface QuoteTemplate {
  id: number
  name: string
  description: string | null
  is_default: boolean
  position: number
  steps?: QuoteTemplateStep[]
  updated_at: string
}

/** Collaborateur de l'entreprise (GET /api/collaborators). Le tarif n'est renvoyé qu'à la gestion. */
export interface Collaborator {
  id: number
  number: string | null
  last_name: string
  first_name: string | null
  name: string
  hourly_cost?: number | null
  /** Position régie : élément de coûts « Salaire » (tarif vendu), avec tarif propre éventuel. */
  regie_element_id?: number | null
  regie_element?: { id: number; number: string; description: string; regie_price: number | null } | null
  regie_price?: number | null
  effective_regie_price?: number | null
  user_id?: number | null
  user_email?: string | null
  is_active: boolean
  updated_at: string
}

/** Unité de mesure (GET /api/units) : le code est ce qui s'imprime. */
export interface Unit {
  id: number
  code: string
  label: string | null
  position: number
  is_active: boolean
}

/** Colonne supplémentaire de la grille des heures (repas, kilomètres, formation…). */
export interface WorkType {
  id: number
  code: string
  label: string
  unit: string
  is_active?: boolean
  position?: number
}

export interface ReportStep {
  id: number
  code: string
  label: string
}

/** Cellule de la grille « Salaire » : collaborateur × étape (ou type de travail). */
export interface DailyReportHour {
  id: number
  collaborator_id: number
  document_step_id: number | null
  work_type_id: number | null
  quantity: number
  hourly_cost?: number | null
  amount?: number
  regie_price?: number | null
  regie_amount?: number
  client_price?: number | null
  client_amount?: number
}

/** Ressource consommée (famille 2 à 6 des éléments de coûts). */
export interface DailyReportItem {
  id: number
  family: number
  document_step_id: number | null
  price_element_id: number | null
  label: string
  unit: string | null
  quantity: number
  unit_cost?: number | null
  amount?: number
  regie_price?: number | null
  regie_amount?: number
  client_price?: number | null
  client_amount?: number
  note: string | null
  position: number
}

export interface DailyReportFile {
  id: number
  url: string
  original_name: string
  mime: string | null
  size: number
  is_image: boolean
  caption: string | null
  position: number
}

/** Rapport journalier (GET /api/daily-reports/{id}). Les montants n'existent que pour la gestion. */
export interface DailyReport {
  id: number
  project_id: number
  project?: { id: number; number: string; designation1: string }
  document_id: number | null
  document?: { id: number; number: string; status: DocumentStatus } | null
  steps?: ReportStep[]
  sequence: number
  number: string
  date: string
  status: ReportStatus
  is_regie: boolean
  responsible_id: number | null
  responsible?: string | null
  created_by: number | null
  remark: string | null
  events: string | null
  weather: string | null
  temp_min: number | null
  temp_max: number | null
  total_hours: number
  total_amount?: number
  total_regie?: number
  total_client?: number
  can_edit: boolean
  hours?: DailyReportHour[]
  items?: DailyReportItem[]
  files?: DailyReportFile[]
  updated_at: string
}

/** Ligne de régie (GET /api/regie/lines) : heure d'un collaborateur ou ressource, avec ses trois niveaux de prix. */
export interface RegieLine {
  kind: 'hour' | 'item'
  id: number
  report_id: number
  report_number: string
  report_sequence: number
  date: string
  status: ReportStatus
  locked: boolean
  project_id: number
  family: number
  collaborator_id: number | null
  step_id: number | null
  step: string | null
  label: string
  regie_label: string | null
  regie_number: string | null
  unit: string | null
  quantity: number
  cost_price: number | null
  regie_price: number | null
  client_price: number | null
  cost_amount: number
  regie_amount: number
  client_amount: number
}

export interface RegieReport {
  id: number
  number: string
  date: string
  status: ReportStatus
  is_regie: boolean
  project: { id: number; number: string; designation1: string } | null
  total_hours: number
  total_amount: number
  total_regie: number
  total_client: number
}

export interface RegieTotals {
  hours: number
  cost: number
  regie: number
  client: number
}

/** Contrôle des heures : ligne de collaborateur du mois (GET /api/hours-control). */
export interface HoursControlCollaborator {
  id: number
  number: string | null
  name: string
  last_name: string
  first_name: string | null
  is_active: boolean
  hours: number
  pending: number
  absence_hours: number
}

export interface HoursControlCell {
  hours: number
  status: ReportStatus
  report_ids: number[]
}

export type AbsenceType = 'vacances' | 'maladie' | 'accident' | 'ferie' | 'ecole' | 'militaire' | 'autre'

export interface CollaboratorAbsence {
  id: number
  type: AbsenceType
  hours: number
  note: string | null
}

/** Matrice projets × jours d'un collaborateur (GET /api/hours-control/{id}). */
export interface HoursControlMatrix {
  collaborator: { id: number; number: string | null; name: string }
  month: string
  days: number
  projects: {
    id: number
    number: string
    designation1: string
    status: ProjectStatus
    total: number
    cells: Record<string, HoursControlCell>
  }[]
  absences: Record<string, CollaboratorAbsence>
  day_hours: number
  absence_types: Record<AbsenceType, string>
}
