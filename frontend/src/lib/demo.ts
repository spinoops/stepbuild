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
      { collaboratorId: 'c1', hours: { '01': 1 } },
      { collaboratorId: 'c3', hours: { '01': 1 } },
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

export interface DemoArticle {
  chapter: string
  code: string
  sub: string
  description: string
  unit: string
  purchase: number | null
  sale: number | null
  workType: string
  category: string
  isTitle: boolean
}

export const DEMO_ARTICLES: DemoArticle[] = [
  { chapter: '00', code: '', sub: '', description: 'ARCHITECTURE', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: true },
  { chapter: '00', code: '001', sub: '', description: 'Architecture (pré-projet, projet, demandes d’offres, devis estimatif, plans et demande de permis, plans de construction …)', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: false },
  { chapter: '01', code: '', sub: '', description: 'INGENIERIE', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: true },
  { chapter: '01', code: '001', sub: '', description: 'Ingénieur : calculations des portées, étude sismique, listes armatures, plans de coffrage et ferraillage, contrôles avant bétonnage …', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: false },
  { chapter: '02', code: '', sub: '', description: 'SUIVI ET INSTALLATION DE CHANTIER', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: true },
  { chapter: '02', code: '003', sub: '', description: 'Suivi et installation de chantier y compris transports personnels, outillages et matériaux. Mise en œuvre, manutention et administration (création devis, rapports journaliers, décomptes, téléphones, séances …)', unit: 'Jour', purchase: null, sale: 95, workType: '02', category: '', isTitle: false },
  { chapter: '02', code: '007', sub: '', description: 'Location tableau électrique', unit: 'MS', purchase: 320, sale: 500, workType: '02', category: '', isTitle: false },
  { chapter: '02', code: '009', sub: '', description: 'Fourniture et pose barrières chantier (longueur 2.5 m, y compris 1 plot)', unit: 'm1', purchase: 9, sale: 15, workType: '02', category: '', isTitle: false },
  { chapter: '02', code: '014', sub: '', description: 'Montage grue y compris transports', unit: 'Bloc', purchase: null, sale: 2000, workType: '02', category: '', isTitle: false },
  { chapter: '02', code: '020', sub: '', description: 'Location grue par mois', unit: 'MS', purchase: null, sale: 1500, workType: '02', category: '', isTitle: false },
  { chapter: '02', code: '050', sub: '', description: 'Fourniture et pose échafaudages', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: false },
  { chapter: '02', code: '050', sub: '005', description: 'Fourniture et pose échafaudage (location 2 mois)', unit: 'M2', purchase: 18, sale: 30, workType: '02', category: '', isTitle: false },
  { chapter: '02', code: '075', sub: '', description: 'PROTECTIONS, SIGNALISATIONS ET CALFEUTRAGES', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: false },
  { chapter: '02', code: '075', sub: '005', description: 'Protections et calfeutrages pour toutes les opérations du chantier', unit: 'Bloc', purchase: null, sale: 350, workType: '02', category: '', isTitle: false },
  { chapter: '02', code: '075', sub: '010', description: 'Protection de sol avec geotextil', unit: 'M2', purchase: 2.5, sale: 5, workType: '02', category: '', isTitle: false },
  { chapter: '03', code: '', sub: '', description: 'DEMONTAGE', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: true },
  { chapter: '03', code: '005', sub: '', description: 'Démontage (…) y compris évacuation et taxe de décharge', unit: 'Bloc', purchase: null, sale: 1200, workType: '03', category: '', isTitle: false },
  { chapter: '12', code: '', sub: '', description: 'CARRELAGE', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: true },
  { chapter: '12', code: '005', sub: '', description: 'Habillage prêt à carreler', unit: 'Pce', purchase: 260, sale: 400, workType: '12', category: '', isTitle: false },
  { chapter: '12', code: '025', sub: '', description: 'Fourniture et pose carrelage sol y compris étude, équerrages, coupes, encollage et jointoyages', unit: 'M2', purchase: 70, sale: 120, workType: '12', category: '', isTitle: false },
  { chapter: '12', code: '030', sub: '', description: 'Fourniture et pose carrelage murs y compris étude, équerrages, coupes, encollage et jointoyages', unit: 'M2', purchase: 75, sale: 130, workType: '12', category: '', isTitle: false },
  { chapter: '12', code: '040', sub: '', description: 'Fourniture et pose baguette d’angle inox ou autre y compris angles', unit: 'M1', purchase: 22, sale: 45, workType: '12', category: '', isTitle: false },
  { chapter: '12', code: '100', sub: '', description: 'Fourniture et pose acryls et/ou silicones', unit: 'M1', purchase: 5, sale: 12, workType: '12', category: '', isTitle: false },
  { chapter: '17', code: '', sub: '', description: 'SOUS-TRAITANTS', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: true },
  { chapter: '17', code: '005', sub: '', description: 'SANITAIRE - CHAUFFAGISTE', unit: '', purchase: null, sale: null, workType: '17', category: '', isTitle: false },
  { chapter: '17', code: '010', sub: '', description: 'ELECTRICITE', unit: '', purchase: null, sale: null, workType: '17', category: '', isTitle: false },
  { chapter: '18', code: '', sub: '', description: 'DIVERS ET IMPREVUS', unit: '', purchase: null, sale: null, workType: '', category: '', isTitle: true },
  { chapter: '18', code: '005', sub: '', description: 'Ouvrier qualifié', unit: 'H.', purchase: 52.78, sale: 90, workType: '18', category: '', isTitle: false },
  { chapter: '18', code: '010', sub: '', description: 'En régie (ouvrier qualifié Fr.)', unit: 'H.', purchase: 52.78, sale: 95, workType: '18', category: '', isTitle: false },
]

export type PriceFamily = 1 | 2 | 3 | 4 | 5 | 6

export const PRICE_FAMILIES: { id: PriceFamily; label: string }[] = [
  { id: 1, label: '1 - Salaire' },
  { id: 2, label: '2 - Matériaux' },
  { id: 3, label: '3 - Machines/Engins' },
  { id: 4, label: '4 - Matériaux exploitation' },
  { id: 5, label: '5 - Outillage' },
  { id: 6, label: '6 - Tiers' },
]

export interface DemoPriceElement {
  family: PriceFamily
  group: string
  number: string
  description: string
  unit: string
  unitRegie: string
  supplierPrice: number
  net: number
  regieRate: string
  unitCom: number
  mutation: string
}

export const DEMO_PRICE_ELEMENTS: DemoPriceElement[] = [
  { family: 1, group: 'S10', number: '010.000', description: 'Ouvrier qualifié', unit: 'H.', unitRegie: 'H.', supplierPrice: 52.78, net: 52.78, regieRate: '1.010.000', unitCom: 1, mutation: '01.01.2026' },
  { family: 1, group: 'S10', number: '010.005', description: 'Ouvrier non qualifié', unit: 'H.', unitRegie: 'H.', supplierPrice: 48.5, net: 48.5, regieRate: '1.010.005', unitCom: 1, mutation: '01.01.2026' },
  { family: 1, group: 'S10', number: '010.010', description: 'Chef d’équipe', unit: 'H.', unitRegie: 'H.', supplierPrice: 58.0, net: 58.0, regieRate: '1.010.010', unitCom: 1, mutation: '01.01.2026' },
  { family: 1, group: 'S10', number: '010.015', description: 'Apprenti', unit: 'H.', unitRegie: 'H.', supplierPrice: 22.0, net: 22.0, regieRate: '1.010.015', unitCom: 1, mutation: '01.01.2026' },
  { family: 2, group: 'M92', number: '020.000', description: 'Chiffon microfibre bleu (10 pcs) paquet', unit: 'Paquet', unitRegie: 'Paquet', supplierPrice: 18.8, net: 18.8, regieRate: '2.020.000', unitCom: 1, mutation: '07.10.2024' },
  { family: 2, group: 'M92', number: '020.001', description: 'Chiffon de nettoyage couleur', unit: 'Sac', unitRegie: 'Sac', supplierPrice: 13.85, net: 13.85, regieRate: '2.020.001', unitCom: 1, mutation: '18.12.2024' },
  { family: 2, group: 'M92', number: '020.015', description: 'Demi-masque kit avec filtres A2 set', unit: 'Pce', unitRegie: 'Pce', supplierPrice: 92.0, net: 92.0, regieRate: '2.020.015', unitCom: 1, mutation: '04.10.2024' },
  { family: 2, group: 'M92', number: '020.030', description: 'Disque de nettoyage ø 115 mm, fin', unit: 'Pce', unitRegie: 'Pce', supplierPrice: 16.7, net: 16.7, regieRate: '2.020.030', unitCom: 1, mutation: '04.10.2024' },
  { family: 2, group: 'M92', number: '020.040', description: 'Film de masquage 2500 mm × 27 m, plié sur 30 cm', unit: 'Rlx', unitRegie: 'Rlx', supplierPrice: 21.28, net: 21.28, regieRate: '2.020.040', unitCom: 1, mutation: '04.10.2024' },
  { family: 2, group: 'M92', number: '020.075', description: 'Lunette de protection claire', unit: 'Pce', unitRegie: 'Pce', supplierPrice: 23.1, net: 23.1, regieRate: '2.020.075', unitCom: 1, mutation: '04.10.2024' },
  { family: 2, group: 'M10', number: '100.000', description: 'Ciment CEM II 25 kg', unit: 'Sac', unitRegie: 'Sac', supplierPrice: 9.9, net: 9.9, regieRate: '2.100.000', unitCom: 1, mutation: '01.09.2025' },
  { family: 2, group: 'M10', number: '100.010', description: 'Sable 0-4 mm', unit: 'To', unitRegie: 'To', supplierPrice: 38.0, net: 38.0, regieRate: '2.100.010', unitCom: 1, mutation: '01.09.2025' },
  { family: 3, group: 'E10', number: '300.000', description: 'Mini-pelle 1.8 t', unit: 'H.', unitRegie: 'H.', supplierPrice: 35.0, net: 35.0, regieRate: '3.300.000', unitCom: 1, mutation: '01.01.2026' },
  { family: 3, group: 'E10', number: '300.005', description: 'Dumper 1.5 t', unit: 'H.', unitRegie: 'H.', supplierPrice: 22.0, net: 22.0, regieRate: '3.300.005', unitCom: 1, mutation: '01.01.2026' },
  { family: 3, group: 'E20', number: '300.100', description: 'Camion nacelle jusqu’à 16 m', unit: 'H.', unitRegie: 'H.', supplierPrice: 65.0, net: 65.0, regieRate: '3.300.100', unitCom: 1, mutation: '01.01.2026' },
  { family: 4, group: 'X10', number: '400.000', description: 'Carburant diesel', unit: 'L', unitRegie: 'L', supplierPrice: 1.85, net: 1.85, regieRate: '4.400.000', unitCom: 1, mutation: '01.06.2026' },
  { family: 5, group: 'O10', number: '500.000', description: 'Marteau-piqueur électrique', unit: 'Jour', unitRegie: 'Jour', supplierPrice: 25.0, net: 25.0, regieRate: '5.500.000', unitCom: 1, mutation: '01.01.2026' },
  { family: 5, group: 'O10', number: '500.005', description: 'Scie à carrelage', unit: 'Jour', unitRegie: 'Jour', supplierPrice: 18.0, net: 18.0, regieRate: '5.500.005', unitCom: 1, mutation: '01.01.2026' },
  { family: 6, group: 'T10', number: '600.000', description: 'Sanitaire (sous-traitant)', unit: 'H.', unitRegie: 'H.', supplierPrice: 95.0, net: 95.0, regieRate: '6.600.000', unitCom: 1, mutation: '01.01.2026' },
  { family: 6, group: 'T10', number: '600.005', description: 'Électricien (sous-traitant)', unit: 'H.', unitRegie: 'H.', supplierPrice: 98.0, net: 98.0, regieRate: '6.600.005', unitCom: 1, mutation: '01.01.2026' },
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
