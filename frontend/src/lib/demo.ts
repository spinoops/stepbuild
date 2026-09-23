/**
 * DONNÉES D'EXEMPLE (fictives) pour illustrer l'interface tant que les modules
 * ne sont pas branchés sur l'API. À supprimer au fil des phases 1 à 6.
 */
import type { ProjectStatus } from '@/types'

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
