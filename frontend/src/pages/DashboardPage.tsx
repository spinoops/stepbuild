import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { NAV_GROUPS } from '@/lib/navigation'
import { useProjectStats } from '@/hooks/useProjects'
import { PROJECT_STATUSES } from '@/lib/status'
import type { ProjectStatus } from '@/types'
import { ROLE_LABELS, hasRole, primaryRole } from '@/lib/roles'
import { Icon } from '@/components/icons'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'

const FLOW = [
  { icon: 'folder', title: 'Projet', text: 'Créer le chantier : client, adresses, statut.', to: '/projets' },
  { icon: 'file', title: 'Devis', text: 'Choisir les étapes depuis les modèles et chiffrer.', to: '/documents' },
  { icon: 'clipboard', title: 'Rapports journaliers', text: 'Saisir heures et matériel sur les étapes du devis.', to: '/rapports' },
  { icon: 'calculator', title: 'Régie et contrôle', text: 'Prix brut → majoré → client, contrôle des heures.', to: '/regie' },
  { icon: 'file', title: 'Facture', text: 'Facture finale depuis les rapports validés.', to: '/documents' },
] as const


export default function DashboardPage() {
  const { user } = useAuth()
  const role = primaryRole(user)
  const stats = useProjectStats()

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

      <section className="mb-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Projets actifs</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Link to="/projets" className="rounded-xl bg-anthracite-900 p-4 text-white shadow-sm transition hover:bg-anthracite-800">
            <div className="text-3xl font-semibold">{stats.data?.total ?? '–'}</div>
            <div className="text-xs text-gray-300">Tous les projets</div>
          </Link>
          {(Object.keys(PROJECT_STATUSES) as ProjectStatus[]).map((status) => (
            <Link
              key={status}
              to="/projets"
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow"
            >
              <div className="text-3xl font-semibold text-gray-900">{stats.data?.data[status] ?? '–'}</div>
              <Badge className={`mt-1 ${PROJECT_STATUSES[status].className}`}>{PROJECT_STATUSES[status].label}</Badge>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Parcours d'un chantier</h3>
        <ol className="grid gap-3 md:grid-cols-5">
          {FLOW.map((step, index) => {
            const allowed = modules.some((module) => module.to === step.to) || step.to === '/projets'
            return (
              <li key={step.title} className="relative">
                <Link
                  to={allowed ? step.to : '/dashboard'}
                  className="flex h-full flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <Icon name={step.icon} className="h-4 w-4 text-primary-600" />
                    <span className="font-medium text-gray-900">{step.title}</span>
                  </span>
                  <span className="text-xs text-gray-500">{step.text}</span>
                </Link>
                {index < FLOW.length - 1 && (
                  <Icon name="chevron" className="absolute -right-2.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-gray-300 md:block" />
                )}
              </li>
            )
          })}
        </ol>
        <p className="mt-2 text-xs text-gray-400">
          Différence avec BauBit : le devis est créé juste après le projet et fixe ses étapes ; tout le suivi du chantier s'y rattache.
        </p>
      </section>

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

    </div>
  )
}
