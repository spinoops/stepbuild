import ModulePlaceholder from '@/components/ModulePlaceholder'

export default function DailyReportsPage() {
  return (
    <ModulePlaceholder
      title="Rapports journaliers"
      description="Les heures et le matériel de chaque journée, par projet. Workflow en cours → en contrôle → facturé."
      icon="clipboard"
      phase={3}
      actionLabel="Nouveau rapport"
      features={[
        'En-tête : numéro, date, responsable, météo, description des travaux',
        'Heures par collaborateur et par type de travail (grille de saisie)',
        'Matériaux, machines, outillage, sous-traitants, photos et fichiers',
        'Statuts en cours / en contrôle / facturé en régie, liste colorée',
        'Saisie 100 % clavier, pré-remplissage « comme hier »',
        'Vue mobile / tablette pour la saisie sur le chantier (phase 7)',
      ]}
    />
  )
}
