import Workspace from '@/components/baubit/Workspace'
import { StandardTools, ToolMenu } from '@/components/baubit/Toolbar'
import ModulePlaceholder from '@/components/ModulePlaceholder'
import PagePane from '@/components/PagePane'

export default function StatsPage() {
  return (
    <Workspace
      tabLabel="Evaluations"
      toolbar={
        <>
          <StandardTools />
          <ToolMenu icon="export" label="Export" />
        </>
      }
    >
      <PagePane>
        <ModulePlaceholder
          title="Statistiques"
          description="Suivi de facturation et synthèses, calculés automatiquement depuis les rapports et les factures."
          icon="chart"
          phase={5}
          features={[
            'Suivi de facturation par chantier : devisé, facturé, coûts réels, marge minimale et réelle, redistribution',
            'Listing annuel des chantiers facturés et des travaux en cours',
            'Synthèse annuelle par employé : heures par chantier et par mois, familles de chantiers',
            'Congés, fériés, maladie, absences ; heures productives et non productives',
            'Exports Excel et PDF',
          ]}
        />
      </PagePane>
    </Workspace>
  )
}
