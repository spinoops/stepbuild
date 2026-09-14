import ModulePlaceholder from '@/components/ModulePlaceholder'

export default function CatalogPage() {
  return (
    <ModulePlaceholder
      title="Catalogue d'articles"
      description="Articles par corps de métier : description, unité, prix. Enrichissable à la volée depuis un devis ou un rapport."
      icon="book"
      phase={1}
      actionLabel="Nouvel article"
      features={[
        'Structure arborescente par corps de métier (architecture, démontage, carrelage, sous-traitants…)',
        'Description, unité, prix, type de travail, niveau',
        'Recherche instantanée tolérante aux accents et aux fautes, articles les plus utilisés en premier',
        'Création à la volée depuis le champ de recherche',
        'Reprise du catalogue BauBit (phase 6)',
      ]}
    />
  )
}
