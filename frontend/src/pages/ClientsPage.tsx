import ModulePlaceholder from '@/components/ModulePlaceholder'

export default function ClientsPage() {
  return (
    <ModulePlaceholder
      title="Clients"
      description="Carnet d'adresses centralisé : clients, contacts, fournisseurs et sous-traitants."
      icon="contacts"
      phase={1}
      actionLabel="Nouveau contact"
      features={[
        'Clients, contacts, fournisseurs et sous-traitants dans un seul fichier',
        'Adresses complètes (rue, NPA, lieu, téléphone, email)',
        'Rattachement automatique aux projets, devis et factures',
        'Recherche instantanée dès la 2ème lettre',
      ]}
    />
  )
}
