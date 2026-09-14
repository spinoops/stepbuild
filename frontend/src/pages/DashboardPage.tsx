import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { NAV_GROUPS } from '@/lib/navigation'
import { PHASES } from '@/lib/phases'
import { ROLE_LABELS, hasRole, primaryRole } from '@/lib/roles'
import { Icon } from '@/components/icons'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

const PHASE_TONE = { done: 'green', current: 'primary', planned: 'gray' } as const
const PHASE_LABEL = { done: 'Livrée', current: 'En cours', planned: 'À venir' } as const

export default function DashboardPage() {
  const { user } = useAuth()
  const role = primaryRole(user)

  // Modules accessibles à l'utilisateur (hors tableau de bord et administration).
  const modules = NAV_GROUPS.filter((group) => !['Général', 'Administration'].includes(group.title))
    .flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })))
    .filter((item) => hasRole(user, item.roles))

  return (
    <div>
      <PageHeader
        title={`Bonjour ${user?.name ?? ''}`}
        description={`Connecté en tant que ${role ? ROLE_LABELS[role].toLowerCase() : 'utilisateur'}.`}
      />

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Modules</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Link
              key={module.to}
              to={module.to}
              className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 transition group-hover:bg-primary-600 group-hover:text-white">
                <Icon name={module.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-gray-900">{module.label}</span>
                <span className="block text-xs text-gray-500">{module.group}</span>
              </span>
              <Icon name="arrow" className="ml-auto h-4 w-4 text-gray-300 transition group-hover:text-primary-600" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <Card title="Avancement du développement" aside={<Badge tone="primary">Phase 0</Badge>}>
          <ol className="space-y-3">
            {PHASES.map((phase) => (
              <li key={phase.number} className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    phase.status === 'current'
                      ? 'bg-primary-600 text-white'
                      : phase.status === 'done'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {phase.status === 'done' ? <Icon name="check" className="h-3.5 w-3.5" /> : phase.number}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{phase.title}</span>
                    <Badge tone={PHASE_TONE[phase.status]}>{PHASE_LABEL[phase.status]}</Badge>
                    <span className="text-xs text-gray-400">{phase.period}</span>
                  </div>
                  <p className="text-sm text-gray-500">{phase.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  )
}
