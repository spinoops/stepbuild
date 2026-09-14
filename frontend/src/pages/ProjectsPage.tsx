import ModulePlaceholder from '@/components/ModulePlaceholder'

export default function ProjectsPage() {
  return (
    <ModulePlaceholder
      title="Projets"
      description="Un projet par chantier : numéro, désignations, adresses, photos, statut et arborescence d'étapes."
      icon="folder"
      phase={2}
      actionLabel="Nouveau projet"
      features={[
        'Fiche projet : numéro, désignations 1 et 2, client, adresses multiples nommées',
        'Statuts en cours / adjugé / terminé / refusé, liste filtrable et colorée',
        'Photos de présentation du chantier',
        'Arborescence d’étapes personnalisable (main d’œuvre, matériaux, machines, sous-traitants…)',
        'Rattachement des rapports journaliers et des documents',
      ]}
    />
  )
}
