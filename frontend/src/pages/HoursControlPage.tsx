import ModulePlaceholder from '@/components/ModulePlaceholder'

export default function HoursControlPage() {
  return (
    <ModulePlaceholder
      title="Contrôle des heures"
      description="Vue mensuelle par collaborateur : projets × jours, totaux, vacances, validation par code couleur."
      icon="clock"
      phase={4}
      features={[
        'Matrice projets × jours du mois pour un collaborateur',
        'Totaux par jour, par projet et total hebdomadaire',
        'Vacances, jours fériés, maladie et absences',
        'Code couleur selon l’état de validation',
        'Filtres par mois, semaine, période, équipe',
      ]}
    />
  )
}
