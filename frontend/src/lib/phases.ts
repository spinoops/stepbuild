/** Phases de développement (cf. Plan de création — Logiciel de chantier, v1.1). */
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
    summary: 'Initialisation depuis baseapp, rôles admin / responsable / ouvrier, navigation par modules.',
    period: 'Septembre 2026',
    status: 'current',
  },
  {
    number: 1,
    title: 'Données de base',
    summary: 'Clients et adresses, catalogue d’articles, listes de prix, recherche instantanée.',
    period: 'Septembre – octobre 2026',
    status: 'planned',
  },
  {
    number: 2,
    title: 'Projets',
    summary: 'Fiche projet, statuts, adresses multiples, photos, arborescence d’étapes.',
    period: 'Octobre 2026',
    status: 'planned',
  },
  {
    number: 3,
    title: 'Rapports journaliers',
    summary: 'Heures, matériaux, machines, sous-traitants ; workflow en cours → en contrôle → facturé.',
    period: '1 – 12 novembre 2026',
    status: 'planned',
  },
  {
    number: 4,
    title: 'Régie et contrôle des heures',
    summary: 'Prix brut → majoré → client ; matrice collaborateur × jours.',
    period: '12 – 20 novembre 2026',
    status: 'planned',
  },
  {
    number: 5,
    title: 'Documents et statistiques',
    summary: 'Devis, acomptes, factures, export PDF ; suivi de facturation et synthèses par employé.',
    period: '20 – 27 novembre 2026',
    status: 'planned',
  },
  {
    number: 6,
    title: 'Reprise des données BauBit',
    summary: 'Import projets, clients, catalogue, prix ; finitions ; environnement de test.',
    period: '27 – 30 novembre 2026',
    status: 'planned',
  },
  {
    number: 7,
    title: 'Vue mobile / tablette',
    summary: 'Saisie simplifiée des rapports par les ouvriers sur le chantier.',
    period: 'Janvier 2027',
    status: 'planned',
  },
  {
    number: 8,
    title: 'Widget de temps et stocks',
    summary: 'Gestion du temps au bureau et stocks des produits (entrées/sorties, alertes).',
    period: 'Janvier 2027',
    status: 'planned',
  },
]
