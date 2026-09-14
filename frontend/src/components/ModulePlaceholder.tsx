import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { PHASES } from '@/lib/phases'

interface ModulePlaceholderProps {
  title: string
  description: string
  icon: IconName
  /** Phase de développement qui livre ce module. */
  phase: number
  /** Fonctionnalités prévues (cf. Plan de création). */
  features: string[]
  /** Libellé de l'action principale future (ex. « Nouveau projet »). */
  actionLabel?: string
}

/**
 * Page d'un module pas encore développé : rappelle le périmètre prévu et la phase
 * de livraison. À remplacer par la vraie page lors de la phase concernée.
 */
export default function ModulePlaceholder({
  title,
  description,
  icon,
  phase,
  features,
  actionLabel,
}: ModulePlaceholderProps) {
  const phaseMeta = PHASES.find((item) => item.number === phase)

  return (
    <div>
      <PageHeader title={title} description={description}>
        {actionLabel && (
          <Button disabled title={`Disponible en phase ${phase}`}>
            <Icon name="plus" className="mr-1.5 h-4 w-4" />
            {actionLabel}
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" flush>
          <EmptyState
            icon={icon}
            title="Module en préparation"
            description={
              phaseMeta
                ? `Livré en phase ${phase} — ${phaseMeta.title} (${phaseMeta.period}).`
                : `Livré en phase ${phase}.`
            }
          >
            <Badge tone="primary">Phase {phase}</Badge>
          </EmptyState>
        </Card>

        <Card title="Périmètre prévu">
          <ul className="space-y-2 text-sm text-gray-600">
            {features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
