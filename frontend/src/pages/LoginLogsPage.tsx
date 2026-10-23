import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { ToolButton, ToolSep } from '@/components/baubit/Toolbar'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import GridPager from '@/components/baubit/GridPager'
import { BbInput } from '@/components/baubit/Form'
import Badge from '@/components/ui/Badge'
import { useDebounced } from '@/hooks/useDebounced'
import { api } from '@/lib/api'
import { EMPTY_QUERY, gridParams } from '@/lib/crud'
import type { GridQuery } from '@/lib/crud'
import type { Paginated } from '@/types'

type LoginEvent = 'login' | 'failed' | 'throttled' | 'logout' | 'password_reset'

interface LoginLog {
  id: number
  created_at: string
  event: LoginEvent
  reason: 'unknown_email' | 'bad_password' | null
  email: string | null
  user: { id: number; name: string; deleted: boolean } | null
  ip_address: string | null
  device: string | null
  user_agent: string | null
}

interface LoginLogSummary {
  logins_24h: number
  failed_24h: number
  failed_ips_24h: number
  retention_days: number
}

const EVENTS: Record<LoginEvent, { label: string; className: string }> = {
  login: { label: 'Connexion', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Échec', className: 'bg-red-100 text-red-700' },
  throttled: { label: 'Bloquée', className: 'bg-red-600 text-white' },
  logout: { label: 'Déconnexion', className: 'bg-gray-100 text-gray-700' },
  password_reset: { label: 'Mot de passe changé', className: 'bg-amber-100 text-amber-800' },
}

const REASONS: Record<string, string> = {
  unknown_email: 'E-mail inconnu',
  bad_password: 'Mauvais mot de passe',
}

const COLUMNS: GridColumn<LoginLog>[] = [
  {
    key: 'created_at',
    header: 'Date et heure',
    value: (log) => log.created_at,
    width: 150,
    noFilter: true,
    render: (log) => new Date(log.created_at).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'medium' }),
  },
  {
    key: 'event',
    header: 'Événement',
    value: (log) => EVENTS[log.event]?.label ?? log.event,
    width: 160,
    noFilter: true,
    render: (log) => <Badge className={EVENTS[log.event]?.className ?? ''}>{EVENTS[log.event]?.label ?? log.event}</Badge>,
  },
  {
    key: 'user',
    header: 'Utilisateur',
    value: (log) => log.user?.name ?? '',
    width: 180,
    noFilter: true,
    render: (log) =>
      log.user ? (
        <span className={log.user.deleted ? 'text-gray-400 line-through' : ''} title={log.user.deleted ? 'Compte supprimé' : undefined}>
          {log.user.name}
        </span>
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
  { key: 'email', header: 'E-mail saisi', value: (log) => log.email, width: 230 },
  { key: 'reason', header: 'Motif', value: (log) => (log.reason ? REASONS[log.reason] ?? log.reason : ''), width: 160, noFilter: true },
  { key: 'ip_address', header: 'Adresse IP', value: (log) => log.ip_address, width: 130 },
  {
    key: 'user_agent',
    header: 'Navigateur',
    value: (log) => log.device,
    width: 170,
    render: (log) => <span title={log.user_agent ?? undefined}>{log.device ?? ''}</span>,
  },
]

/**
 * Journal des connexions (administration) : connexions réussies et refusées, tentatives bloquées par le
 * limiteur, déconnexions, mots de passe réinitialisés. Du plus récent au plus ancien, filtres par
 * événement, période et colonne ; résumé des dernières 24 h dans le panneau.
 */
export default function LoginLogsPage() {
  const [query, setQuery] = useState<GridQuery>(EMPTY_QUERY)
  const [event, setEvent] = useState<'' | LoginEvent>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const debounced = useDebounced(query, 250)
  const params = gridParams(debounced, { event, from, to }, 100)

  const list = useQuery({
    queryKey: ['login-logs', 'list', params],
    queryFn: async () => (await api.get<Paginated<LoginLog> & { summary: LoginLogSummary }>('/login-logs', { params })).data,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000, // le journal se tient à jour pendant qu'on le consulte
  })
  const summary = list.data?.summary

  const chip = (active: boolean) =>
    `flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition ${active ? 'bg-anthracite-800 font-medium text-white' : 'text-gray-600 hover:bg-gray-100'}`
  const choose = (value: '' | LoginEvent) => {
    setEvent(value)
    setQuery({ ...query, page: 1 })
  }

  return (
    <Workspace
      entries={list.data?.meta.total ?? null}
      tabLabel="Journal des connexions"
      asideWidth={260}
      toolbar={
        <>
          <button type="button" className={chip(event === '')} onClick={() => choose('')}>
            Tous
          </button>
          {(Object.keys(EVENTS) as LoginEvent[]).map((key) => (
            <button key={key} type="button" className={chip(event === key)} onClick={() => choose(key)}>
              {EVENTS[key].label}
            </button>
          ))}
          <ToolSep />
          <span className="text-[12px] text-gray-500">Du</span>
          <BbInput type="date" value={from} onChange={(e) => { setFrom(e.target.value); setQuery({ ...query, page: 1 }) }} className="w-36" />
          <span className="text-[12px] text-gray-500">au</span>
          <BbInput type="date" value={to} onChange={(e) => { setTo(e.target.value); setQuery({ ...query, page: 1 }) }} className="w-36" />
          <ToolSep />
          <ToolButton icon="refresh" title="Actualiser" onClick={() => void list.refetch()} />
        </>
      }
      aside={
        <AsidePanel title="Connexions" nav={[{ icon: 'shield', label: 'Journal des connexions', active: true }]}>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Dernières 24 heures</div>
          <dl className="mt-2 space-y-2 text-[13px]">
            <SummaryRow label="Connexions réussies" value={summary?.logins_24h} tone="text-green-700" />
            <SummaryRow label="Échecs et blocages" value={summary?.failed_24h} tone={summary?.failed_24h ? 'text-red-700' : 'text-gray-800'} />
            <SummaryRow label="Adresses IP en échec" value={summary?.failed_ips_24h} tone={summary?.failed_ips_24h ? 'text-red-700' : 'text-gray-800'} />
          </dl>
          <p className="mt-4 text-[12px] leading-relaxed text-gray-500">
            Beaucoup d'échecs depuis une même adresse IP signalent une tentative d'intrusion : après 6 essais en une minute, la
            connexion est bloquée et tracée « Bloquée ».
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-gray-400">
            Conservation : {summary?.retention_days ?? 365} jours, puis purge automatique.
          </p>
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <DataGrid
          className="min-h-0 flex-1"
          columns={COLUMNS}
          rows={list.data?.data ?? []}
          rowKey={(row) => String(row.id)}
          rowClass={(row) => (row.event === 'failed' || row.event === 'throttled' ? 'bg-red-50/60' : 'bg-white')}
          query={query}
          onQueryChange={(next) => setQuery({ ...next, page: 1 })}
          emptyText={list.isLoading ? 'Chargement…' : 'Aucune connexion pour ces critères.'}
        />
        <GridPager meta={list.data?.meta} onPage={(page) => setQuery({ ...query, page })} loading={list.isFetching} />
      </div>
    </Workspace>
  )
}

function SummaryRow({ label, value, tone }: { label: string; value: number | undefined; tone: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-lg border border-gray-200 px-3 py-2">
      <dt className="text-gray-600">{label}</dt>
      <dd className={`text-[16px] font-semibold tabular-nums ${tone}`}>{value ?? '…'}</dd>
    </div>
  )
}
