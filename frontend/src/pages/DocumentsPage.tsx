import ModulePlaceholder from '@/components/ModulePlaceholder'

export default function DocumentsPage() {
  return (
    <ModulePlaceholder
      title="Documents"
      description="Devis, acomptes et factures d'un projet, avec numérotation automatique et export PDF."
      icon="file"
      phase={5}
      actionLabel="Nouveau document"
      features={[
        'Devis estimatif construit depuis l’arborescence et le catalogue, par chapitres',
        'Positions hiérarchiques : quantités, prix, montants, récapitulation et TVA',
        'Acomptes et transformation devis → facture',
        'Facture finale depuis les rapports validés',
        'Numérotation automatique (ex. 2853-055-DE.1), impression PDF',
      ]}
    />
  )
}
