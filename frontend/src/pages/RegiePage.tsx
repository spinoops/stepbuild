import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { ToolButton, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import { BbCheckbox, BbInput, BbSelect } from '@/components/baubit/Form'
import PriceCell from '@/components/regie/PriceCell'
import { Icon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import { useCollaborators } from '@/hooks/useDailyReports'
import { useProjectOptions } from '@/hooks/useProjects'
import { useApplyTariffs, useRegieLines, useUpdateRegieLine } from '@/hooks/useRegie'
import type { RegieFilters } from '@/hooks/useRegie'
import { costFamily } from '@/lib/costFamilies'
import { fmtAmount, fmtDate } from '@/lib/format'
import { REPORT_STATUSES } from '@/lib/status'
import { toast } from '@/lib/toast'
import { setProject, useWorkspace } from '@/lib/workspaceStore'
import type { RegieLine, RegieReport, ReportStatus } from '@/types'

const TABS = ['Lignes de régie', 'Récapitulation']

const HEAD = 'border-b border-gray-200 bg-bb-ribbon px-2 py-1.5 text-[11px] font-semibold text-gray-500'
const NUM = 'px-2 py-0.5 text-right tabular-nums'

/**
 * Régie : les lignes des rapports journaliers du projet courant (heures des collaborateurs, matériaux,
 * machines, tiers…) avec leurs trois niveaux de prix — brut (coût), régie (tarif majoré de l'entreprise),
 * client — contrôlables et modifiables jusqu'à la facturation. Même logique que le « rapport régie » BauBit.
 */
export default function RegiePage() {
  const navigate = useNavigate()
  const { projectId } = useWorkspace()
  const [tab, setTab] = useState(TABS[0])
  const [status, setStatus] = useState<ReportStatus | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [collaboratorId, setCollaboratorId] = useState('')
  const [all, setAll] = useState(false)
  const [reportId, setReportId] = useState<number | null>(null)

  const filters = useMemo<RegieFilters>(
    () => ({ project_id: projectId, status, from, to, collaborator_id: collaboratorId ? Number(collaboratorId) : null, all }),
    [projectId, status, from, to, collaboratorId, all],
  )
  const query = useRegieLines(filters, projectId !== null)
  const update = useUpdateRegieLine(filters)
  const applyTariffs = useApplyTariffs()
  const projects = useProjectOptions()
  const collaborators = useCollaborators()

  const project = projects.data?.find((item) => item.id === projectId) ?? null
  const reports = query.data?.reports ?? []
  const allLines = query.data?.data ?? []
  const lines = reportId === null ? allLines : allLines.filter((line) => line.report_id === reportId)
  const totals = useMemo(
    () => ({
      hours: lines.filter((line) => line.kind === 'hour').reduce((sum, line) => sum + line.quantity, 0),
      cost: lines.reduce((sum, line) => sum + line.cost_amount, 0),
      regie: lines.reduce((sum, line) => sum + line.regie_amount, 0),
      client: lines.reduce((sum, line) => sum + line.client_amount, 0),
    }),
    [lines],
  )

  function save(line: RegieLine, field: 'cost_price' | 'regie_price' | 'client_price', value: number | null) {
    update.mutate(
      { line, payload: { [field]: value } },
      { onError: () => toast("Le prix n'a pas pu être enregistré.", 'error') },
    )
  }

  function reapplyTariffs() {
    if (!projectId) return
    const open = reports.filter((report) => report.status !== 'facture')
    if (
      !window.confirm(
        `Réappliquer les tarifs actuels (collaborateurs, éléments de coûts, majoration) aux ${open.length} rapport${open.length > 1 ? 's' : ''} non facturé${open.length > 1 ? 's' : ''} du projet ?\nLes prix régie et client saisis à la main seront remplacés.`,
      )
    ) {
      return
    }
    applyTariffs.mutate(
      { project_id: projectId },
      {
        onSuccess: (count) => toast(`Tarifs réappliqués sur ${count} rapport${count > 1 ? 's' : ''}.`, 'success'),
        onError: () => toast("Les tarifs n'ont pas pu être réappliqués.", 'error'),
      },
    )
  }

  const reportColumns: GridColumn<RegieReport>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date, true), width: 96, noFilter: true },
    { key: 'number', header: 'N°', value: (r) => r.number, width: 44, noFilter: true },
    {
      key: 'status',
      header: 'Statut',
      value: (r) => REPORT_STATUSES[r.status].label,
      width: 84,
      noFilter: true,
      render: (r) => <Badge className={REPORT_STATUSES[r.status].className}>{REPORT_STATUSES[r.status].code}</Badge>,
    },
    { key: 'total_hours', header: 'Heures', value: (r) => r.total_hours || null, type: 'number', width: 56, noFilter: true },
    { key: 'total_client', header: 'Client', value: (r) => r.total_client || null, type: 'number', width: 76, noFilter: true },
  ]

  const statusLeft = projectId
    ? `Brut : ${fmtAmount(totals.cost)} CHF   |   Régie : ${fmtAmount(totals.regie)} CHF   |   Client : ${fmtAmount(totals.client)} CHF   |   Heures : ${fmtAmount(totals.hours)}`
    : undefined
  const margin = totals.client > 0 ? ((totals.client - totals.cost) / totals.client) * 100 : null
  const statusRight = margin !== null ? `Marge sur le prix client : ${fmtAmount(margin, 1)} %${update.isPending ? '   |   Enregistrement…' : ''}` : undefined

  return (
    <Workspace
      asideWidth={400}
      tabLabel={project ? `Régie : ${project.number} - ${project.designation1}` : 'Régie'}
      entries={projectId ? lines.length : null}
      statusLeft={statusLeft}
      statusRight={statusRight}
      toolbar={
        <>
          <ToolButton icon="refresh" title="Réappliquer les tarifs actuels aux rapports non facturés" tone="primary" disabled={!projectId || reports.length === 0} onClick={reapplyTariffs} />
          <ToolButton icon="clipboard" title="Ouvrir les rapports journaliers du projet" tone="primary" disabled={!projectId} onClick={() => navigate('/rapports')} />
          <ToolSep />
          <ToolButton icon="print" title="Imprimer le rapport de régie (phase 6)" />
          <ToolMenu icon="export" label="Export" />
        </>
      }
      aside={
        <AsidePanel
          title="Rapports"
          nav={[
            { icon: 'table', label: 'Tous les rapports du projet', active: reportId === null, onClick: () => setReportId(null) },
            { icon: 'folder', label: 'Tous les projets', onClick: () => setProject(null) },
          ]}
        >
          <div className="mt-1 space-y-2">
            <div className="flex items-center gap-2">
              <BbSelect value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | '')} className="min-w-0 flex-1" aria-label="Statut">
                <option value="">Tous les statuts</option>
                {(Object.keys(REPORT_STATUSES) as ReportStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {REPORT_STATUSES[key].code} · {REPORT_STATUSES[key].label}
                  </option>
                ))}
              </BbSelect>
              <BbSelect value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)} className="min-w-0 flex-1" aria-label="Collaborateur">
                <option value="">Tous les collaborateurs</option>
                {(collaborators.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </BbSelect>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-gray-500">
              <span>Du</span>
              <BbInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[132px]" aria-label="Du" />
              <span>au</span>
              <BbInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[132px]" aria-label="Au" />
            </div>
            <BbCheckbox label="Inclure les rapports hors régie" checked={all} onChange={(e) => setAll(e.target.checked)} />
          </div>
          <div className="mb-2 mt-3 text-[13px] font-semibold text-gray-800">{project ? `${project.number} · ${project.designation1}` : 'Aucun projet'}</div>
          <DataGrid
            className="rounded-lg border border-gray-200"
            columns={reportColumns}
            rows={reports}
            rowKey={(row) => String(row.id)}
            rowClass={(row) => REPORT_STATUSES[row.status].rowClass}
            selectedKey={reportId === null ? null : String(reportId)}
            onSelect={(row) => setReportId(row.id === reportId ? null : row.id)}
            showFilter={false}
            emptyText={query.isLoading ? 'Chargement…' : projectId ? 'Aucun rapport de régie pour ce projet.' : 'Choisissez un projet.'}
          />
        </AsidePanel>
      }
    >
      {!projectId ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-500">
          <Icon name="calculator" className="h-8 w-8 text-gray-300" />
          <p className="font-medium text-gray-700">Aucun projet sélectionné.</p>
          <p className="max-w-md text-[13px]">Choisissez un projet dans la barre du haut : la régie reprend les lignes de ses rapports journaliers avec les prix brut, régie et client.</p>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <TabStrip tabs={TABS} active={tab} onChange={setTab} className="shrink-0 px-4" />
          <div className="flex h-9 shrink-0 items-center gap-4 bg-primary-50/60 px-4 text-[12px] text-primary-800">
            <span>
              <span className="font-semibold">Brut</span> = coût pour l'entreprise
            </span>
            <span>
              <span className="font-semibold">Régie</span> = tarif majoré (position régie du collaborateur, prix régie de l'élément ou coût majoré)
            </span>
            <span>
              <span className="font-semibold">Client</span> = prix final, modifiable jusqu'à la facturation
            </span>
          </div>
          {tab === TABS[0] ? (
            <RegieLinesTable lines={lines} reports={reports} onSave={save} onOpenReport={(id) => navigate(`/rapports?id=${id}`)} loading={query.isLoading} />
          ) : (
            <RegieSummary lines={lines} reports={reports} selectedReport={reportId} />
          )}
        </div>
      )}
    </Workspace>
  )
}

interface LinesTableProps {
  lines: RegieLine[]
  reports: RegieReport[]
  onSave: (line: RegieLine, field: 'cost_price' | 'regie_price' | 'client_price', value: number | null) => void
  onOpenReport: (id: number) => void
  loading: boolean
}

/** Lignes groupées par rapport, prix unitaires éditables en place. */
function RegieLinesTable({ lines, reports, onSave, onOpenReport, loading }: LinesTableProps) {
  const byReport = useMemo(() => {
    const map = new Map<number, RegieLine[]>()
    lines.forEach((line) => map.set(line.report_id, [...(map.get(line.report_id) ?? []), line]))
    return map
  }, [lines])
  const reportById = new Map(reports.map((report) => [report.id, report]))

  if (!loading && lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-gray-500">
        <Icon name="clipboard" className="h-8 w-8 text-gray-300" />
        <p className="font-medium text-gray-700">Aucune ligne de régie.</p>
        <p className="max-w-md text-[13px]">Les heures et ressources saisies dans les rapports journaliers marqués « Régie » apparaissent ici.</p>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={`${HEAD} w-44 text-left`}>Étape</th>
            <th className={`${HEAD} text-left`}>Désignation</th>
            <th className={`${HEAD} w-52 text-left`}>Désignation régie</th>
            <th className={`${HEAD} w-12 text-left`}>Un.</th>
            <th className={`${HEAD} w-16 text-right`}>Quantité</th>
            <th className={`${HEAD} w-[92px] text-right`}>Brut</th>
            <th className={`${HEAD} w-24 text-right`}>Montant</th>
            <th className={`${HEAD} w-[92px] border-l border-gray-200 text-right`}>Régie</th>
            <th className={`${HEAD} w-24 text-right`}>Montant</th>
            <th className={`${HEAD} w-[92px] border-l border-gray-200 text-right`}>Client</th>
            <th className={`${HEAD} w-24 text-right`}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {[...byReport.entries()].map(([reportId, group]) => {
            const report = reportById.get(reportId)
            const sub = {
              cost: group.reduce((sum, line) => sum + line.cost_amount, 0),
              regie: group.reduce((sum, line) => sum + line.regie_amount, 0),
              client: group.reduce((sum, line) => sum + line.client_amount, 0),
            }
            return (
              <GroupRows key={reportId} report={report} group={group} sub={sub} onSave={onSave} onOpenReport={onOpenReport} />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface GroupRowsProps {
  report: RegieReport | undefined
  group: RegieLine[]
  sub: { cost: number; regie: number; client: number }
  onSave: LinesTableProps['onSave']
  onOpenReport: (id: number) => void
}

function GroupRows({ report, group, sub, onSave, onOpenReport }: GroupRowsProps) {
  const first = group[0]
  const status = report?.status ?? first.status
  return (
    <>
      <tr className="bg-gray-100">
        <td colSpan={11} className="px-2 py-1">
          <button type="button" onClick={() => onOpenReport(first.report_id)} className="inline-flex items-center gap-2 text-[12px] font-semibold text-gray-800 hover:text-primary-700" title="Ouvrir le rapport">
            <Icon name="clipboard" className="h-3.5 w-3.5 text-gray-400" />
            Rapport {first.report_number} · {fmtDate(first.date, true)}
          </button>
          <Badge className={`ml-3 ${REPORT_STATUSES[status].className}`}>{REPORT_STATUSES[status].label}</Badge>
          {first.locked && <span className="ml-2 text-[11px] text-gray-400">verrouillé</span>}
        </td>
      </tr>
      {group.map((line) => (
        <tr key={`${line.kind}-${line.id}`} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="truncate px-2 py-0.5 text-gray-500" title={line.step ?? ''}>
            {line.step ?? '—'}
          </td>
          <td className="px-2 py-0.5">
            <span className="mr-1.5 inline-block w-5 text-[10px] font-semibold uppercase text-gray-400" title={costFamily(line.family).label}>
              {line.kind === 'hour' ? 'MO' : costFamily(line.family).code}
            </span>
            <span className={line.kind === 'hour' ? 'font-medium text-gray-800' : ''}>{line.label}</span>
          </td>
          <td className="truncate px-2 py-0.5 text-gray-500" title={line.regie_label ?? ''}>
            {line.regie_number && <span className="mr-1 text-gray-400">{line.regie_number}</span>}
            {line.regie_label ?? ''}
          </td>
          <td className="px-2 py-0.5 text-gray-500">{line.unit ?? ''}</td>
          <td className={NUM}>{fmtAmount(line.quantity, line.kind === 'hour' ? 2 : 3).replace(/\.?0+$/, '')}</td>
          <td className="py-0.5 pr-1 text-right">
            <PriceCell value={line.cost_price} onSave={(value) => onSave(line, 'cost_price', value)} disabled={line.locked} label="Prix brut" />
          </td>
          <td className={`${NUM} text-gray-600`}>{fmtAmount(line.cost_amount)}</td>
          <td className="border-l border-gray-100 py-0.5 pr-1 text-right">
            <PriceCell value={line.regie_price} onSave={(value) => onSave(line, 'regie_price', value)} disabled={line.locked} label="Prix régie" />
          </td>
          <td className={`${NUM} text-gray-600`}>{fmtAmount(line.regie_amount)}</td>
          <td className="border-l border-gray-100 py-0.5 pr-1 text-right">
            <PriceCell
              value={line.client_price}
              onSave={(value) => onSave(line, 'client_price', value)}
              disabled={line.locked}
              highlight={line.client_price !== null && line.client_price !== line.regie_price}
              label="Prix client"
            />
          </td>
          <td className={`${NUM} font-medium`}>{fmtAmount(line.client_amount)}</td>
        </tr>
      ))}
      <tr className="border-b border-gray-200 text-[12px] text-gray-600">
        <td colSpan={6} className="px-2 py-1 text-right">
          Total du rapport
        </td>
        <td className={NUM}>{fmtAmount(sub.cost)}</td>
        <td className="border-l border-gray-100" />
        <td className={NUM}>{fmtAmount(sub.regie)}</td>
        <td className="border-l border-gray-100" />
        <td className={`${NUM} font-semibold text-gray-800`}>{fmtAmount(sub.client)}</td>
      </tr>
    </>
  )
}

interface SummaryProps {
  lines: RegieLine[]
  reports: RegieReport[]
  selectedReport: number | null
}

/** Récapitulation par famille (salaire, matériaux, machines…) et par rapport, aux trois niveaux. */
function RegieSummary({ lines, reports, selectedReport }: SummaryProps) {
  const families = [1, 2, 3, 4, 5, 6].map((family) => {
    const group = lines.filter((line) => line.family === family)
    return {
      family,
      label: family === 1 ? 'Main-d’œuvre (heures)' : costFamily(family).label,
      quantity: family === 1 ? group.reduce((sum, line) => sum + line.quantity, 0) : null,
      cost: group.reduce((sum, line) => sum + line.cost_amount, 0),
      regie: group.reduce((sum, line) => sum + line.regie_amount, 0),
      client: group.reduce((sum, line) => sum + line.client_amount, 0),
      count: group.length,
    }
  })
  const total = {
    cost: families.reduce((sum, row) => sum + row.cost, 0),
    regie: families.reduce((sum, row) => sum + row.regie, 0),
    client: families.reduce((sum, row) => sum + row.client, 0),
  }
  const marginOf = (cost: number, client: number) => (client > 0 ? `${fmtAmount(((client - cost) / client) * 100, 1)} %` : '')
  const shownReports = selectedReport === null ? reports : reports.filter((report) => report.id === selectedReport)

  return (
    <div className="flex min-h-0 flex-1 gap-8 overflow-auto p-5">
      <div className="w-[640px] shrink-0">
        <h3 className="mb-2 text-[13px] font-semibold text-gray-800">Par famille</h3>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={`${HEAD} text-left`}>Famille</th>
              <th className={`${HEAD} w-16 text-right`}>Heures</th>
              <th className={`${HEAD} w-24 text-right`}>Brut</th>
              <th className={`${HEAD} w-24 text-right`}>Régie</th>
              <th className={`${HEAD} w-24 text-right`}>Client</th>
              <th className={`${HEAD} w-16 text-right`}>Marge</th>
            </tr>
          </thead>
          <tbody>
            {families
              .filter((row) => row.count > 0)
              .map((row) => (
                <tr key={row.family} className="border-b border-gray-100">
                  <td className="px-2 py-1">{row.label}</td>
                  <td className={NUM}>{row.quantity !== null ? fmtAmount(row.quantity) : ''}</td>
                  <td className={NUM}>{fmtAmount(row.cost)}</td>
                  <td className={NUM}>{fmtAmount(row.regie)}</td>
                  <td className={`${NUM} font-medium`}>{fmtAmount(row.client)}</td>
                  <td className={`${NUM} text-gray-500`}>{marginOf(row.cost, row.client)}</td>
                </tr>
              ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-3 text-gray-400">
                  Aucune ligne.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 font-semibold text-gray-800">
              <td className="px-2 py-1.5">Total</td>
              <td className={NUM}>{fmtAmount(families[0].quantity ?? 0)}</td>
              <td className={NUM}>{fmtAmount(total.cost)}</td>
              <td className={NUM}>{fmtAmount(total.regie)}</td>
              <td className={NUM}>{fmtAmount(total.client)}</td>
              <td className={`${NUM} ${total.client > 0 && (total.client - total.cost) / total.client < 0.3 ? 'text-accent-700' : 'text-green-700'}`}>{marginOf(total.cost, total.client)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-2 text-[12px] text-gray-400">Marge = (client − brut) / client. Seuil interne : 30 %.</p>
      </div>
      <div className="min-w-[520px] flex-1">
        <h3 className="mb-2 text-[13px] font-semibold text-gray-800">Par rapport</h3>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={`${HEAD} text-left`}>Rapport</th>
              <th className={`${HEAD} w-24 text-left`}>Statut</th>
              <th className={`${HEAD} w-16 text-right`}>Heures</th>
              <th className={`${HEAD} w-24 text-right`}>Brut</th>
              <th className={`${HEAD} w-24 text-right`}>Régie</th>
              <th className={`${HEAD} w-24 text-right`}>Client</th>
            </tr>
          </thead>
          <tbody>
            {shownReports.map((report) => (
              <tr key={report.id} className="border-b border-gray-100">
                <td className="px-2 py-1">
                  {report.number} · {fmtDate(report.date, true)}
                </td>
                <td className="px-2 py-1">
                  <Badge className={REPORT_STATUSES[report.status].className}>{REPORT_STATUSES[report.status].code}</Badge>
                </td>
                <td className={NUM}>{fmtAmount(report.total_hours)}</td>
                <td className={NUM}>{fmtAmount(report.total_amount)}</td>
                <td className={NUM}>{fmtAmount(report.total_regie)}</td>
                <td className={`${NUM} font-medium`}>{fmtAmount(report.total_client)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
