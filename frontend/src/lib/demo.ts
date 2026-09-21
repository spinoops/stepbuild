/**
 * DONNÉES D'EXEMPLE (fictives) pour illustrer l'interface tant que les modules
 * ne sont pas branchés sur l'API. À supprimer au fil des phases 1 à 6.
 */
import type { ProjectStatus, ReportStatus } from '@/types'

export const DEMO_COMPANY = 'Entreprise Exemple Sàrl, Exempleville'
export const DEMO_MONTH = { year: 2026, month: 8, label: 'août 2026' }

export interface DemoProject {
  id: string
  number: string
  designation1: string
  designation2: string
  client: string
  street: string
  streetNo: string
  zip: string
  city: string
  phone: string
  status: ProjectStatus
  active: boolean
  mutation: string
  contractNo: string
}

export const DEMO_PROJECTS: DemoProject[] = [
  { id: 'p1', number: '2600-001', designation1: 'Exemple Dupont - Rénovation salle de bain', designation2: '', client: 'Dupont Marie, Exempleville', street: 'Rue de la Gare', streetNo: '12', zip: '2800', city: 'Delémont', phone: '032 000 00 01', status: 'en_cours', active: true, mutation: '27.08.2026 09:43', contractNo: '' },
  { id: 'p2', number: '2600-002', designation1: 'Exemple Muller - Démolition et maçonnerie', designation2: 'Compte construction', client: 'Muller Hans, Bassecourt', street: 'Rue des Vergers', streetNo: '3', zip: '2854', city: 'Bassecourt', phone: '', status: 'adjuge', active: true, mutation: '20.04.2026 11:13', contractNo: 'C-2026-14' },
  { id: 'p3', number: '2600-003', designation1: 'Exemple Rossi - Aménagements extérieurs', designation2: '', client: 'Rossi Luca, Courroux', street: 'Chemin des Prés', streetNo: '4', zip: '2822', city: 'Courroux', phone: '', status: 'adjuge', active: true, mutation: '26.08.2026 16:51', contractNo: '' },
  { id: 'p4', number: '2600-004', designation1: 'Exemple Favre - Création mur de soutènement', designation2: '', client: 'Favre Jean, Glovelier', street: 'Rue de la Gravière', streetNo: '8', zip: '2855', city: 'Glovelier', phone: '', status: 'adjuge', active: true, mutation: '27.03.2026 08:30', contractNo: '' },
  { id: 'p5', number: '2600-005', designation1: 'Exemple Bernard - Remplacement fenêtres', designation2: '', client: 'Bernard Léa, Bassecourt', street: 'Rue Berlincourt', streetNo: '21', zip: '2854', city: 'Bassecourt', phone: '', status: 'termine', active: true, mutation: '14.07.2026 08:37', contractNo: '' },
  { id: 'p6', number: '2600-006', designation1: 'Exemple Keller - Extension buanderie', designation2: '', client: 'Keller Anna, Develier', street: 'Rue Principale', streetNo: '55', zip: '2802', city: 'Develier', phone: '', status: 'refuse', active: true, mutation: '10.07.2026 11:05', contractNo: '' },
  { id: 'p7', number: '2600-007', designation1: 'Exemple Martin - Carrelage cuisine', designation2: '', client: 'Martin Pierre, Courtételle', street: 'Rue des Primevères', streetNo: '2', zip: '2852', city: 'Courtételle', phone: '', status: 'termine', active: true, mutation: '10.07.2026 11:04', contractNo: '' },
  { id: 'p8', number: '2600-008', designation1: 'Exemple Petit - Couvert à voiture', designation2: '', client: 'Petit Sophie, Bassecourt', street: 'Rue du Clos', streetNo: '17', zip: '2854', city: 'Bassecourt', phone: '', status: 'adjuge', active: true, mutation: '04.03.2026 08:16', contractNo: '' },
]

export interface DemoCollaborator {
  id: string
  number: string
  lastName: string
  firstName: string
  /** Tarif horaire de base (CHF). */
  base: number
}

export const DEMO_COLLABORATORS: DemoCollaborator[] = [
  { id: 'c1', number: '101', lastName: 'Martin', firstName: 'Pierre', base: 52.78 },
  { id: 'c2', number: '102', lastName: 'Rossi', firstName: 'Luca', base: 50.0 },
  { id: 'c3', number: '103', lastName: 'Keller', firstName: 'Anna', base: 52.78 },
  { id: 'c4', number: '104', lastName: 'Nguyen', firstName: 'Thi', base: 50.0 },
  { id: 'c5', number: '105', lastName: 'Favre', firstName: 'Jean', base: 55.0 },
  { id: 'c6', number: '106', lastName: 'Bernard', firstName: 'Léa', base: 48.5 },
]

export function collaboratorName(id: string): string {
  const item = DEMO_COLLABORATORS.find((c) => c.id === id)
  return item ? `${item.lastName} ${item.firstName}` : ''
}

export interface DemoWorkType {
  code: string
  label: string
}

/** Types de travail (colonnes de la grille « Salaire »). */
export const DEMO_WORK_TYPES: DemoWorkType[] = [
  { code: '00', label: 'ARCHITECTURE' },
  { code: '01', label: 'SUIVI DE CHANTIER' },
  { code: '02', label: 'INSTALLATION DE CHANTIER' },
  { code: '03', label: 'DEMONTAGE' },
  { code: '04', label: 'TERRASSEMENT' },
  { code: '05', label: 'CANALISATIONS' },
  { code: '06', label: 'GROS OEUVRE' },
  { code: '07', label: 'MACONNERIE' },
  { code: '08', label: 'CREPISSAGE' },
  { code: '09', label: 'CHAPE' },
  { code: '10', label: 'MENUISERIE' },
  { code: '11', label: 'PLÂTRERIE' },
  { code: '12', label: 'CARRELAGE' },
  { code: '13', label: 'PEINTURE' },
  { code: '14', label: 'SABLAGE' },
  { code: '15', label: 'TAPIS DE PIERRES' },
  { code: '16', label: 'VMC' },
  { code: '17', label: 'SOUS-TRAITANTS' },
  { code: '18', label: 'DIVERS ET IMPREVUS' },
]

export const DEMO_EXTRA_COLUMNS: DemoWorkType[] = [
  { code: '1011', label: 'Travail du samedi' },
  { code: '1110', label: 'Repas' },
  { code: '1120', label: 'Kilomètres' },
  { code: '1150', label: 'Formation' },
]

export const WEATHER_OPTIONS = ['Ensoleillé', 'Partiellement nuageux', 'Couvert', 'Pluie, couvert', 'Neige']

export interface DemoReportLine {
  collaboratorId: string
  /** Heures par code de type de travail (ou colonne supplémentaire). */
  hours: Record<string, number>
}

export interface DemoReport {
  id: string
  projectId: string
  number: string
  date: string
  responsableId: string
  status: ReportStatus
  regie: boolean
  remark: string
  weather: string
  tempMin: number
  tempMax: number
  lines: DemoReportLine[]
}

export const DEMO_REPORTS: DemoReport[] = [
  {
    id: 'r1', projectId: 'p1', number: '001', date: '2026-08-26', responsableId: 'c1', status: 'en_controle', regie: true,
    remark: 'RAPPORT :\n\nSuivi de chantier : séance sur place pour voir travaux à faire',
    weather: 'Partiellement nuageux', tempMin: 21, tempMax: 28,
    lines: [
      { collaboratorId: 'c1', hours: { '02': 1 } },
      { collaboratorId: 'c3', hours: { '02': 1 } },
    ],
  },
  {
    id: 'r2', projectId: 'p1', number: '002', date: '2026-08-27', responsableId: 'c1', status: 'en_controle', regie: true,
    remark: 'RAPPORT 2 :\n\nDémontage : démontage sol carrelage',
    weather: 'Couvert', tempMin: 18, tempMax: 24,
    lines: [
      { collaboratorId: 'c2', hours: { '03': 8.5 } },
      { collaboratorId: 'c4', hours: { '03': 8.5, '1110': 1 } },
    ],
  },
  {
    id: 'r3', projectId: 'p1', number: '003', date: '2026-08-28', responsableId: 'c1', status: 'en_cours', regie: true,
    remark: 'RAPPORT 3 :\n\nCarrelage : pose couche de fond et pose carrelage',
    weather: 'Pluie, couvert', tempMin: 17, tempMax: 20,
    lines: [
      { collaboratorId: 'c2', hours: { '12': 5 } },
      { collaboratorId: 'c1', hours: {} },
      { collaboratorId: 'c3', hours: {} },
      { collaboratorId: 'c4', hours: { '03': 3 } },
    ],
  },
  {
    id: 'r4', projectId: 'p3', number: '001', date: '2026-08-11', responsableId: 'c5', status: 'facture', regie: true,
    remark: 'Terrassement et pose des bordures',
    weather: 'Ensoleillé', tempMin: 19, tempMax: 30,
    lines: [
      { collaboratorId: 'c5', hours: { '04': 9 } },
      { collaboratorId: 'c2', hours: { '04': 9 } },
    ],
  },
]

export interface DemoHourEntry {
  collaboratorId: string
  projectId: string
  day: number
  hours: number
  validated: boolean
}

/** Heures du mois d'août 2026 (contrôle des heures). */
export const DEMO_HOURS: DemoHourEntry[] = [
  { collaboratorId: 'c1', projectId: 'p2', day: 10, hours: 9, validated: true },
  { collaboratorId: 'c1', projectId: 'p3', day: 11, hours: 9, validated: true },
  { collaboratorId: 'c1', projectId: 'p3', day: 12, hours: 9, validated: true },
  { collaboratorId: 'c1', projectId: 'p3', day: 13, hours: 9, validated: false },
  { collaboratorId: 'c1', projectId: 'p8', day: 14, hours: 8.5, validated: true },
  { collaboratorId: 'c1', projectId: 'p4', day: 17, hours: 9, validated: true },
  { collaboratorId: 'c1', projectId: 'p4', day: 18, hours: 9, validated: true },
  { collaboratorId: 'c1', projectId: 'p4', day: 19, hours: 2.5, validated: false },
  { collaboratorId: 'c1', projectId: 'p3', day: 19, hours: 6.5, validated: true },
  { collaboratorId: 'c1', projectId: 'p1', day: 20, hours: 9, validated: false },
  { collaboratorId: 'c1', projectId: 'p2', day: 21, hours: 8.5, validated: true },
  { collaboratorId: 'c1', projectId: 'p1', day: 26, hours: 1, validated: true },
  { collaboratorId: 'c1', projectId: 'p1', day: 27, hours: 9, validated: true },
  { collaboratorId: 'c1', projectId: 'p1', day: 28, hours: 9, validated: false },
  { collaboratorId: 'c2', projectId: 'p3', day: 11, hours: 9, validated: true },
  { collaboratorId: 'c2', projectId: 'p1', day: 27, hours: 8.5, validated: true },
  { collaboratorId: 'c2', projectId: 'p1', day: 28, hours: 5, validated: false },
]

export const DEMO_VACATIONS: { collaboratorId: string; days: number[] }[] = [
  { collaboratorId: 'c1', days: [3, 4, 5, 6, 7] },
]

export interface DemoChapter {
  code: string
  label: string
  children?: DemoChapter[]
}

export const DEMO_CHAPTERS: DemoChapter[] = [
  { code: '00', label: 'ARCHITECTURE' },
  { code: '01', label: 'INGENIERIE' },
  { code: '02', label: 'SUIVI ET INSTALLATION DE CHANTIER' },
  { code: '03', label: 'DEMONTAGE' },
  { code: '04', label: 'TERRASSEMENT ET ALENTOURS' },
  { code: '05', label: 'CANALISATIONS' },
  { code: '06', label: 'GROS-OEUVRE' },
  { code: '07', label: 'MAÇONNERIE' },
  { code: '08', label: 'CREPISSAGES' },
  { code: '09', label: 'CHAPES' },
  { code: '10', label: 'MENUISERIE' },
  { code: '11', label: 'PLÂTRERIE' },
  { code: '12', label: 'CARRELAGE' },
  { code: '13', label: 'PEINTURE' },
  { code: '14', label: 'SABLAGE' },
  { code: '15', label: 'TAPIS DE PIERRE' },
  { code: '16', label: 'VENTILATION' },
  { code: '17', label: 'SOUS-TRAITANTS' },
  {
    code: '18',
    label: 'DIVERS ET IMPREVUS',
    children: [
      { code: '005', label: 'Ouvrier qualifié' },
      { code: '010', label: 'En régie (ouvrier qualifié Fr.)' },
      { code: '015', label: 'Réserve 5%' },
    ],
  },
]

export type AddressType = 'Client' | 'Fournisseur' | 'Sous-traitant' | 'Contact'

export interface DemoAddress {
  id: string
  title: string
  lastName: string
  firstName: string
  street: string
  streetNo: string
  zip: string
  city: string
  phone: string
  email: string
  type: AddressType
  active: boolean
}

export const DEMO_ADDRESSES: DemoAddress[] = [
  { id: 'a1', title: 'Madame', lastName: 'Dupont', firstName: 'Marie', street: 'Rue de la Gare', streetNo: '12', zip: '2800', city: 'Delémont', phone: '032 000 00 01', email: 'marie.dupont@exemple.ch', type: 'Client', active: true },
  { id: 'a2', title: 'Monsieur', lastName: 'Muller', firstName: 'Hans', street: 'Rue des Vergers', streetNo: '3', zip: '2854', city: 'Bassecourt', phone: '032 000 00 02', email: 'hans.muller@exemple.ch', type: 'Client', active: true },
  { id: 'a3', title: 'Monsieur', lastName: 'Rossi', firstName: 'Luca', street: 'Chemin des Prés', streetNo: '4', zip: '2822', city: 'Courroux', phone: '032 000 00 03', email: '', type: 'Client', active: true },
  { id: 'a4', title: 'Monsieur', lastName: 'Favre', firstName: 'Jean', street: 'Rue de la Gravière', streetNo: '8', zip: '2855', city: 'Glovelier', phone: '', email: '', type: 'Client', active: true },
  { id: 'a5', title: 'Entreprise', lastName: 'Matériaux Exemple SA', firstName: '', street: 'Zone industrielle', streetNo: '5', zip: '2800', city: 'Delémont', phone: '032 000 00 10', email: 'vente@materiaux-exemple.ch', type: 'Fournisseur', active: true },
  { id: 'a6', title: 'Entreprise', lastName: 'Sanitaire Exemple Sàrl', firstName: '', street: 'Rue du Stand', streetNo: '9', zip: '2854', city: 'Bassecourt', phone: '032 000 00 11', email: '', type: 'Sous-traitant', active: true },
  { id: 'a7', title: 'Entreprise', lastName: 'Électricité Exemple SA', firstName: '', street: 'Rue Principale', streetNo: '30', zip: '2802', city: 'Develier', phone: '032 000 00 12', email: '', type: 'Sous-traitant', active: true },
  { id: 'a8', title: 'Monsieur', lastName: 'Architecte', firstName: 'Paul', street: 'Avenue de la Gare', streetNo: '2', zip: '2800', city: 'Delémont', phone: '032 000 00 20', email: 'paul@archi-exemple.ch', type: 'Contact', active: true },
  { id: 'a9', title: 'Madame', lastName: 'Keller', firstName: 'Anna', street: 'Rue Principale', streetNo: '55', zip: '2802', city: 'Develier', phone: '', email: '', type: 'Client', active: false },
]

export const DOCUMENT_TYPES = [
  { code: 'ACO', label: 'Acompte N° <NO>' },
  { code: 'DEV', label: 'Devis estimatif N° <NO>' },
  { code: 'FA', label: 'Facture N° <NO>' },
  { code: 'LP', label: 'Liste des plantes' },
  { code: 'PDF', label: 'Plan PDF' },
  { code: 'TE', label: 'Travaux Exécutés N° <NO>' },
]

export interface DemoPosition {
  level: 1 | 2 | 3
  code: string
  description: string
  unit: string
  qty: number | null
  price: number | null
  workType: string
}

export interface DemoDocument {
  id: string
  projectId: string
  type: 'DEV' | 'ACO' | 'FA'
  number: string
  label: string
  date: string
  initials: string
  status: 'en_cours' | 'envoye' | 'accepte'
  responsableId: string
  positions: DemoPosition[]
}

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    id: 'd1', projectId: 'p1', type: 'DEV', number: '2600-001-DE.1', label: 'Devis estimatif N° 2600-001-DE.1',
    date: '2026-08-27', initials: 'AF', status: 'en_cours', responsableId: 'c1',
    positions: [
      { level: 1, code: '00', description: 'ARCHITECTURE', unit: '', qty: null, price: null, workType: '' },
      { level: 2, code: '00.001', description: 'Architecture (pré-projet, projet, demandes d’offres, devis estimatif, plans et demande de permis, plans de construction …)', unit: '', qty: null, price: null, workType: '' },
      { level: 1, code: '02', description: 'SUIVI ET INSTALLATION DE CHANTIER', unit: '', qty: null, price: null, workType: '' },
      { level: 2, code: '02.003', description: 'Suivi et installation de chantier y compris transports personnels, outillages et matériaux. Mise en œuvre, manutention et administration (création devis, rapports journaliers, décomptes, téléphones, séances …)', unit: 'Jour', qty: 3, price: 95, workType: '02' },
      { level: 1, code: '02.075', description: 'PROTECTIONS, SIGNALISATIONS ET CALFEUTRAGES', unit: '', qty: null, price: null, workType: '' },
      { level: 3, code: '02.075.005', description: 'Protections et calfeutrages pour toutes les opérations du chantier', unit: 'Bloc', qty: 1, price: 350, workType: '02' },
      { level: 1, code: '03', description: 'DEMONTAGE', unit: '', qty: null, price: null, workType: '' },
      { level: 2, code: '03.005', description: 'Démontage (…) y compris évacuation et taxe de décharge', unit: 'Bloc', qty: 1, price: 1200, workType: '03' },
      { level: 1, code: '12', description: 'CARRELAGE', unit: '', qty: null, price: null, workType: '' },
      { level: 2, code: '12.005', description: 'Habillage prêt à carreler', unit: 'Pce', qty: 1, price: 400, workType: '12' },
      { level: 2, code: '12.025', description: 'Fourniture et pose carrelage sol y compris étude, équerrages, coupes, encollage et jointoyages (fourniture env. Fr. 45.-/m2 à choisir à notre showroom)', unit: 'M2', qty: 12, price: 120, workType: '12' },
      { level: 2, code: '12.030', description: 'Fourniture et pose carrelage murs y compris étude, équerrages, coupes, encollage et jointoyages (fourniture env. Fr. 45.-/m2 à choisir à notre showroom)', unit: 'M2', qty: 30, price: 130, workType: '12' },
      { level: 2, code: '12.040', description: 'Fourniture et pose baguette d’angle inox ou autre (selon notre showroom) y compris angles', unit: 'M1', qty: 8, price: 45, workType: '12' },
      { level: 2, code: '12.100', description: 'Fourniture et pose acryls et/ou silicones', unit: 'M1', qty: 20, price: 12, workType: '12' },
      { level: 1, code: '17', description: 'SOUS-TRAITANTS', unit: '', qty: null, price: null, workType: '' },
      { level: 2, code: '17.005', description: 'SANITAIRE - CHAUFFAGISTE', unit: '', qty: null, price: null, workType: '17' },
      { level: 3, code: '17.005.001', description: 'Installation sanitaire complète (estimation)', unit: 'Bloc', qty: 1, price: 6500, workType: '17' },
      { level: 2, code: '17.010', description: 'ELECTRICITE', unit: '', qty: null, price: null, workType: '17' },
      { level: 3, code: '17.010.001', description: 'Installation électrique (estimation)', unit: 'Bloc', qty: 1, price: 2500, workType: '17' },
      { level: 1, code: '18', description: 'DIVERS ET IMPREVUS', unit: '', qty: null, price: null, workType: '' },
      { level: 2, code: '18.005', description: 'Ouvrier qualifié', unit: 'H.', qty: 10, price: 90, workType: '18' },
    ],
  },
  {
    id: 'd2', projectId: 'p3', type: 'DEV', number: '2600-003-DE.1', label: 'Devis estimatif N° 2600-003-DE.1',
    date: '2026-03-02', initials: 'AF', status: 'accepte', responsableId: 'c5',
    positions: [
      { level: 1, code: '04', description: 'TERRASSEMENT ET ALENTOURS', unit: '', qty: null, price: null, workType: '' },
      { level: 2, code: '04.010', description: 'Terrassement en pleine masse y compris évacuation', unit: 'M3', qty: 40, price: 65, workType: '04' },
      { level: 2, code: '04.050', description: 'Fourniture et pose bordures béton', unit: 'M1', qty: 35, price: 85, workType: '04' },
    ],
  },
  {
    id: 'd3', projectId: 'p3', type: 'FA', number: '2600-003-FA.1', label: 'Facture N° 2600-003-FA.1',
    date: '2026-08-20', initials: 'AF', status: 'envoye', responsableId: 'c5',
    positions: [
      { level: 1, code: '04', description: 'TERRASSEMENT ET ALENTOURS', unit: '', qty: null, price: null, workType: '' },
      { level: 2, code: '04.010', description: 'Terrassement en pleine masse y compris évacuation', unit: 'M3', qty: 42, price: 65, workType: '04' },
      { level: 2, code: '04.050', description: 'Fourniture et pose bordures béton', unit: 'M1', qty: 35, price: 85, workType: '04' },
    ],
  },
]

/** Étape d'un devis (position de niveau 1 sans sous-numéro). */
export interface DevisStep {
  code: string
  label: string
  /** Nombre de positions rattachées à l'étape. */
  positions: number
}

/** Étapes d'un document (chapitres de niveau 1). */
export function documentSteps(doc: DemoDocument): DevisStep[] {
  return doc.positions
    .filter((position) => position.level === 1 && !position.code.includes('.'))
    .map((position) => ({
      code: position.code,
      label: position.description,
      positions: doc.positions.filter((item) => item.code.startsWith(position.code) && item !== position).length,
    }))
}

/** Devis d'un projet (le premier devis fait référence pour les rapports). */
export function projectDevis(projectId: string): DemoDocument | null {
  return DEMO_DOCUMENTS.find((doc) => doc.projectId === projectId && doc.type === 'DEV') ?? null
}

/**
 * Étapes de chantier d'un projet : celles de son devis. Tout le suivi (rapports
 * journaliers, régie, facture) se rattache à ces étapes.
 */
export function projectSteps(projectId: string): DevisStep[] {
  const devis = projectDevis(projectId)
  return devis ? documentSteps(devis) : []
}

/**
 * Les pages encore en données d'exemple (rapports, documents) ne suivent pas le projet courant
 * réel de la barre de contexte : elles gardent leur propre sélection jusqu'à leur phase.
 */
export const DEMO_CONTEXT = { projectId: null as string | null, documentId: null as string | null }
