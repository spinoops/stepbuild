import Workspace from '@/components/baubit/Workspace'
import { ToolButton, ToolMenu } from '@/components/baubit/Toolbar'
import ModulePlaceholder from '@/components/ModulePlaceholder'
import PagePane from '@/components/PagePane'

export default function RegiePage() {
  return (
    <Workspace
      tabLabel="Tarifs régie"
      toolbar={
        <>
          <ToolButton icon="print" title="Imprimer" />
          <ToolMenu icon="export" label="Export" />
        </>
      }
    >
      <PagePane>
        <ModulePlaceholder
          title="Régie"
          description="Trois niveaux de prix : brut (fournisseur) → majoré (tarifs de l'entreprise) → prix client."
          icon="calculator"
          phase={4}
          features={[
            'Rapport brut aux prix fournisseurs, non majorés',
            'Régie : prix majorés selon les tarifs de l’entreprise',
            'Prix final client, contrôlable et modifiable à chaque étape',
            'Attribution des lignes de rapport aux positions de régie',
            'Rapport de régie pour facture',
          ]}
        />
      </PagePane>
    </Workspace>
  )
}
