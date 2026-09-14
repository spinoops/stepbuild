import ModulePlaceholder from '@/components/ModulePlaceholder'

export default function PriceListsPage() {
  return (
    <ModulePlaceholder
      title="Listes de prix"
      description="Éléments de coûts : matériaux, machines et outils, tarifs horaires des employés."
      icon="tag"
      phase={1}
      actionLabel="Nouvel élément"
      features={[
        'Produits et matériaux : prix fournisseur et prix de revente',
        'Machines, engins et outillage avec prix',
        'Employés : tarifs horaires selon le rôle ou l’employé',
        'Tarifs de régie (prix majorés)',
        'Onglets par famille : salaire, matériaux, machines, outillage, tiers',
      ]}
    />
  )
}
