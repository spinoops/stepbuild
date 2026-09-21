/**
 * Phases de développement. Ordre revu le 21.09.2026 : le devis (étapes + positions) passe
 * juste après les projets, car les rapports journaliers se saisissent sur les étapes du devis.
 * Le périmètre de l'offre est inchangé ; seuls l'ordre et le découpage évoluent.
 */
export interface Phase {
  number: number
  title: string
  summary: string
  period: string
  status: 'done' | 'current' | 'planned'
}

export const PHASES: Phase[] = [
  {
    number: 0,
    title: 'Socle, configuration et rôles',
    summary: 'Initialisation depuis baseapp, rôles admin / responsable / ouvrier, interface et charte Lachat.',
    period: 'Septembre 2026',
    status: 'done',
  },
  {
    number: 1,
    title: 'Données de base',
    summary: 'Adresses, catalogue d’articles (chapitres = modèles d’étapes), éléments de coûts, recherche instantanée.',
    period: 'Septembre 2026',
    status: 'done',
  },
  {
    number: 2,
    title: 'Projets',
    summary: 'Fiche projet, numérotation par NPA, statuts, adresses nommées, photos ; projet courant dans la barre de contexte.',
    period: 'Septembre 2026',
    status: 'done',
  },
  {
    number: 3,
    title: 'Devis : étapes et positions',
    summary: 'Création du devis depuis le projet, étapes depuis les modèles, saisie rapide des positions, chiffrage, récapitulation.',
    period: 'Septembre 2026',
    status: 'done',
  },
  {
    number: 4,
    title: 'Rapports journaliers',
    summary: 'Heures, matériaux, machines, sous-traitants saisis sur les étapes du devis ; workflow de validation.',
    period: 'Octobre 2026',
    status: 'current',
  },
  {
    number: 5,
    title: 'Régie et contrôle des heures',
    summary: 'Prix brut → majoré → client ; matrice collaborateur × jours.',
    period: 'Novembre 2026',
    status: 'planned',
  },
  {
    number: 6,
    title: 'Factures, PDF et statistiques',
    summary: 'Acomptes, factures, facture finale depuis les rapports validés, export PDF ; suivi de facturation et synthèses.',
    period: 'Novembre 2026',
    status: 'planned',
  },
  {
    number: 7,
    title: 'Reprise des données BauBit',
    summary: 'Import projets, clients, catalogue, prix ; finitions ; environnement de test puis mise en production.',
    period: 'Fin novembre – décembre 2026',
    status: 'planned',
  },
  {
    number: 8,
    title: 'Vue mobile / tablette',
    summary: 'Saisie simplifiée des rapports par les ouvriers sur le chantier.',
    period: 'Janvier 2027',
    status: 'planned',
  },
  {
    number: 9,
    title: 'Widget de temps et stocks',
    summary: 'Gestion du temps au bureau et stocks des produits (entrées/sorties, alertes).',
    period: 'Janvier 2027',
    status: 'planned',
  },
]

export const CURRENT_PHASE = PHASES.find((phase) => phase.status === 'current')?.number ?? 0
