import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { ToolButton, ToolSep } from '@/components/baubit/Toolbar'
import { BbInput, BbSelect } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import { useCostControl } from '@/hooks/useCostControl'
import type { ControlStatus, ControlStep, CostControlFilters } from '@/hooks/useCostControl'
import { useProjectOptions } from '@/hooks/useProjects'
import { fmtAmount, fmtDate } from '@/lib/format'
import { DOCUMENT_STATUSES, REPORT_STATUSES } from '@/lib/status'
import { setDocument, setProject, useWorkspace } from '@/lib/workspaceStore'
import type { ReportStatus } from '@/types'

const STATUS: Record<ControlStatus, { label: string; badge: string; row: string; bar: string }> = {
  ok: { label: 'Dans le budget', badge: 'bg-green-100 text-green-800', row: 'bg-green-50/70', bar: 'bg-green-500' },
  over: { label: 'Dépassé', badge: 'bg-red-600 text-white', row: 'bg-red-50', bar: 'bg-red-500' },
  none: { label: 'Rien de prévu', badge: 'bg-gray-100 text-gray-600', row: 'bg-white', bar: 'bg-gray-300' },
}

const HEAD = 'border-b border-gray-200 bg-bb-ribbon px-2 py-1.5 text-[11px] font-semibold text-gray-500'
const NUM = 'px-2 py-1.5 text-right tabular-nums'
const qty = (value: number) => String(Math.round(value * 100) / 100)

/**
 * Rapport de régie : pour chaque étape du devis du projet courant, ce qui a été chiffré (vente, prix de
 * revient, heures) face à ce que les rapports journaliers ont consommé (heures, coût brut, régie, client).
 * Vert = dans le budget, rouge = dépassé. Le budget est le prix de revient du devis quand il est connu,
 * sinon son prix de vente. Chaque étape se déplie sur les rapports qui l'ont alimentée.
 */
export default function CostControlPage() {
  const navigate = useNavigate()
  const { projectId } = useWorkspace()
  const [documentId, setDocumentId] = useState<number | null>(null)
  const [status, setStatus] = useState<ReportStatus | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<Set<string>>(() => new Set())

  const filters = useMemo<CostControlFilters>(() => ({ project_id: projectId, document_id: documentId, status, from, to }), [projectId, documentId, status, from, to])
  const query = useCostControl(filters)
  const data = query.data ?? null
  const projects = useProjectOptions()
  const project = projects.data?.find((item) => item.id === projectId) ?? null
  const rows = data ? [...data.steps, ...data.others] : []
  const over = rows.filter((row) => row.status === 'over').length

  function toggle(key: string) {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function openReport(id: number) {
    navigate(`/rapports?id=${id}`)
  }

  const chip = (active: boolean) =>
    `flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition ${active ? 'bg-anthracite-800 font-medium text-white' : 'text-gray-600 hover:bg-gray-100'}`

  return (
    <Workspace
      entries={data ? data.steps.length + data.others.length : null}
      tabLabel="Rapport de régie"
      statusLeft={data ? `${data.reports.count} rapport${data.reports.count > 1 ? 's' : ''}${data.reports.from ? ` du ${fmtDate(data.reports.from)} au ${fmtDate(data.reports.to ?? data.reports.from)}` : ''}` : undefined}
      totals={data ? `Budget : ${fmtAmount(data.totals.planned.budget)} CHF   ·   Réalisé : ${fmtAmount(data.totals.actual.cost)} CHF   ·   Écart : ${fmtAmount(data.totals.variance)} CHF` : undefined}
      asideWidth={300}
      toolbar={
        <>
          <button type="button" className={chip(status === '')} onClick={() => setStatus('')}>
            Tous les rapports
          </button>
          {(Object.keys(REPORT_STATUSES) as ReportStatus[]).map((key) => (
            <button key={key} type="button" className={chip(status === key)} onClick={() => setStatus(status === key ? '' : key)}>
              <span className={`h-2 w-2 rounded-full border border-black/10 ${REPORT_STATUSES[key].rowClass.split(' ')[0]}`} />
              {REPORT_STATUSES[key].label}
            </button>
          ))}
          <ToolSep />
          <span className="text-[12px] text-gray-500">Du</span>
          <BbInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          <span className="text-[12px] text-gray-500">au</span>
          <BbInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          {data && data.documents.length > 1 && (
            <>
              <ToolSep />
              <span className="text-[12px] text-gray-500">Devis</span>
              <BbSelect value={String(documentId ?? data.document?.id ?? '')} onChange={(e) => setDocumentId(e.target.value ? Number(e.target.value) : null)} className="w-48">
                {data.documents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.number} · {DOCUMENT_STATUSES[item.status].label}
                  </option>
                ))}
              </BbSelect>
            </>
          )}
          <ToolSep />
          <ToolButton icon="refresh" title="Actualiser" onClick={() => void query.refetch()} />
        </>
      }
      aside={
        <AsidePanel title="Rapport de régie" nav={[{ icon: 'chart', label: 'Devis contre rapports', active: true }]}>
          {!projectId && <p className="text-[13px] text-gray-400">Choisissez un projet dans la barre du haut.</p>}
          {project && (
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-[12px] font-semibold text-gray-400">{project.number}</div>
              <div className="text-[13px] font-medium text-gray-800">{project.designation1}</div>
              {data?.document && (
                <button
                  type="button"
                  onClick={() => {
                    setProject(project.id)
                    setDocument(data.document!.id)
                    navigate(`/documents?id=${data.document!.id}`)
                  }}
                  className="mt-1.5 text-[12px] text-primary-700 hover:underline"
                >
                  Devis {data.document.number} · {DOCUMENT_STATUSES[data.document.status].label}
                </button>
              )}
              {data && !data.document && <p className="mt-1.5 text-[12px] text-red-600">Ce projet n'a pas de devis : rien à comparer.</p>}
            </div>
          )}

          {data && (
            <>
              <div className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Ensemble du chantier</div>
              <div className={`mt-2 rounded-lg border p-3 ${data.totals.status === 'over' ? 'border-red-200 bg-red-50' : data.totals.status === 'ok' ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                <Badge className={STATUS[data.totals.status].badge}>{STATUS[data.totals.status].label}</Badge>
                <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
                  <dt className="text-gray-600">Budget ({data.totals.budget_basis === 'cost' ? 'prix de revient' : 'vente'})</dt>
                  <dd className="text-right tabular-nums">{fmtAmount(data.totals.planned.budget)}</dd>
                  <dt className="text-gray-600">Coût réalisé</dt>
                  <dd className={`text-right font-semibold tabular-nums ${data.totals.status === 'over' ? 'text-red-700' : 'text-gray-900'}`}>{fmtAmount(data.totals.actual.cost)}</dd>
                  <dt className="text-gray-600">Écart</dt>
                  <dd className={`text-right tabular-nums ${data.totals.variance < 0 ? 'text-red-700' : 'text-green-700'}`}>{fmtAmount(data.totals.variance)}</dd>
                  <dt className="text-gray-600">Heures prévues / réalisées</dt>
                  <dd className="text-right tabular-nums">
                    {qty(data.totals.planned.hours)} / {qty(data.totals.actual.hours)} h
                  </dd>
                  <dt className="text-gray-600">Vente devis</dt>
                  <dd className="text-right tabular-nums">{fmtAmount(data.totals.planned.sale)}</dd>
                  <dt className="text-gray-600">Facturable client</dt>
                  <dd className="text-right tabular-nums">{fmtAmount(data.totals.actual.client)}</dd>
                </dl>
                {data.totals.percent !== null && <Bar percent={data.totals.percent} status={data.totals.status} />}
              </div>
              <p className="mt-3 text-[12px] text-gray-500">
                {over > 0 ? `${over} étape${over > 1 ? 's' : ''} en dépassement.` : 'Aucune étape en dépassement.'}
              </p>
            </>
          )}

          <div className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Lecture</div>
          <ul className="mt-2 space-y-1.5 text-[12px] text-gray-600">
            <li>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
              Coût brut des rapports dans le budget de l'étape.
            </li>
            <li>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
              Budget dépassé, ou dépenses sur une étape sans rien de prévu.
            </li>
            <li>Budget = prix de revient du devis (sous-détails, prix d'achat) ; sinon son prix de vente.</li>
            <li>Les heures sur les types de travail (samedi, formation…) sont regroupées « hors devis ».</li>
          </ul>
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col overflow-auto">
        {!projectId ? (
          <Empty text="Choisissez un projet dans la barre du haut pour comparer son devis à ses rapports." />
        ) : query.isLoading ? (
          <Empty text="Chargement…" />
        ) : query.isError ? (
          <Empty text="Le rapport n'a pas pu être chargé." />
        ) : data && rows.length === 0 ? (
          <Empty text="Ce devis n'a pas d'étape et aucun rapport n'a été saisi." />
        ) : (
          data && (
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={`${HEAD} w-8`} />
                  <th className={`${HEAD} w-10 text-left`}>N°</th>
                  <th className={`${HEAD} text-left`}>Étape</th>
                  <th className={`${HEAD} w-28 text-right`} title="Prix de vente du devis (hors options)">
                    Devis vente
                  </th>
                  <th className={`${HEAD} w-28 text-right`} title="Prix de revient du devis (sous-détails, prix d'achat)">
                    Prix de revient
                  </th>
                  <th className={`${HEAD} w-24 text-right`} title="Heures prévues (positions en heures, main-d'œuvre des sous-détails) / réalisées">
                    Heures prév. / réal.
                  </th>
                  <th className={`${HEAD} w-28 text-right`} title="Coût brut des rapports : heures × tarif + ressources">
                    Coût réalisé
                  </th>
                  <th className={`${HEAD} w-28 text-right`} title="Budget − coût réalisé">
                    Écart
                  </th>
                  <th className={`${HEAD} w-36 text-left`} title="Part du budget consommée">
                    Consommé
                  </th>
                  <th className={`${HEAD} w-28 text-right`} title="Montant régie des rapports (tarifs majorés)">
                    Régie
                  </th>
                  <th className={`${HEAD} w-28 text-right`} title="Montant client des rapports (facturable)">
                    Client
                  </th>
                  <th className={`${HEAD} w-32 text-left`}>État</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const key = row.id === null ? 'other' : String(row.id)
                  const expanded = open.has(key)
                  const isOther = index >= data.steps.length
                  return (
                    <StepRows key={key} row={row} isOther={isOther} expanded={expanded} onToggle={() => toggle(key)} onOpenReport={openReport} />
                  )
                })}
              </tbody>
              <tfoot>
                <tr className={`border-t-2 border-gray-800 font-semibold ${STATUS[data.totals.status].row}`}>
                  <td />
                  <td colSpan={2} className="px-2 py-2">
                    Total du chantier
                  </td>
                  <td className={NUM}>{fmtAmount(data.totals.planned.sale)}</td>
                  <td className={NUM}>{data.totals.planned.cost > 0 ? fmtAmount(data.totals.planned.cost) : ''}</td>
                  <td className={NUM}>
                    {qty(data.totals.planned.hours)} / {qty(data.totals.actual.hours)}
                  </td>
                  <td className={NUM}>{fmtAmount(data.totals.actual.cost)}</td>
                  <td className={`${NUM} ${data.totals.variance < 0 ? 'text-red-700' : 'text-green-700'}`}>{fmtAmount(data.totals.variance)}</td>
                  <td className="px-2 py-2">{data.totals.percent !== null && <Bar percent={data.totals.percent} status={data.totals.status} />}</td>
                  <td className={NUM}>{fmtAmount(data.totals.actual.regie)}</td>
                  <td className={NUM}>{fmtAmount(data.totals.actual.client)}</td>
                  <td className="px-2 py-2">
                    <Badge className={STATUS[data.totals.status].badge}>{STATUS[data.totals.status].label}</Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          )
        )}
      </div>
    </Workspace>
  )
}

interface StepRowsProps {
  row: ControlStep
  isOther: boolean
  expanded: boolean
  onToggle: () => void
  onOpenReport: (id: number) => void
}

/** Une étape (ligne colorée) et, dépliés, les rapports journaliers qui l'ont alimentée. */
function StepRows({ row, isOther, expanded, onToggle, onOpenReport }: StepRowsProps) {
  const meta = STATUS[row.status]
  const hasReports = row.reports.length > 0
  return (
    <>
      <tr
        className={`border-b border-gray-200 ${meta.row} ${hasReports ? 'cursor-pointer hover:brightness-[0.98]' : ''}`}
        onClick={hasReports ? onToggle : undefined}
        title={hasReports ? 'Afficher les rapports journaliers de cette étape' : undefined}
      >
        <td className="px-2 py-1.5 text-center text-gray-400">{hasReports && <Icon name="chevron" className={`inline h-3.5 w-3.5 transition ${expanded ? 'rotate-90' : ''}`} />}</td>
        <td className="px-2 py-1.5 text-gray-500">{row.code}</td>
        <td className={`px-2 py-1.5 ${isOther ? 'italic text-gray-600' : 'font-medium text-gray-900'}`}>{row.label}</td>
        <td className={NUM}>{row.planned ? fmtAmount(row.planned.sale) : ''}</td>
        <td className={`${NUM} ${row.planned?.cost === null ? 'text-gray-400' : ''}`} title={row.planned && row.planned.cost === null ? 'Pas de prix de revient : le budget est le prix de vente' : undefined}>
          {row.planned ? (row.planned.cost !== null ? fmtAmount(row.planned.cost) : '—') : ''}
        </td>
        <td className={NUM}>
          {row.planned ? `${qty(row.planned.hours)} / ` : ''}
          <span className={row.planned && row.actual.hours > row.planned.hours ? 'font-semibold text-red-700' : ''}>{qty(row.actual.hours)}</span>
        </td>
        <td className={`${NUM} ${row.status === 'over' ? 'font-semibold text-red-700' : ''}`}>{fmtAmount(row.actual.cost)}</td>
        <td className={`${NUM} ${row.variance !== null && row.variance < 0 ? 'text-red-700' : 'text-green-700'}`}>{row.variance !== null ? fmtAmount(row.variance) : ''}</td>
        <td className="px-2 py-1.5">{row.percent !== null && <Bar percent={row.percent} status={row.status} />}</td>
        <td className={NUM}>{fmtAmount(row.actual.regie)}</td>
        <td className={NUM}>{fmtAmount(row.actual.client)}</td>
        <td className="px-2 py-1.5">
          <Badge className={meta.badge}>{meta.label}</Badge>
        </td>
      </tr>
      {expanded &&
        row.reports.map((report) => (
          <tr key={report.id} className="border-b border-gray-100 bg-white text-[12px] text-gray-600">
            <td />
            <td />
            <td className="whitespace-nowrap px-2 py-1 pl-6">
              <button type="button" onClick={() => onOpenReport(report.id)} className="text-primary-700 hover:underline" title="Ouvrir le rapport journalier">
                Rapport {report.number} du {fmtDate(report.date)}
              </button>
              <Badge className={`ml-2 ${REPORT_STATUSES[report.status].className}`}>{REPORT_STATUSES[report.status].label}</Badge>
            </td>
            <td />
            <td />
            <td className={NUM}>{qty(report.hours)}</td>
            <td className={NUM}>{fmtAmount(report.cost)}</td>
            <td />
            <td />
            <td className={NUM}>{fmtAmount(report.regie)}</td>
            <td className={NUM}>{fmtAmount(report.client)}</td>
            <td />
          </tr>
        ))}
    </>
  )
}

/** Barre de consommation du budget : pleine à 100 %, rouge au-delà. */
function Bar({ percent, status }: { percent: number; status: ControlStatus }) {
  const width = Math.min(100, Math.max(0, percent))
  return (
    <div className="flex items-center gap-2" title={`${percent} % du budget consommé`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${STATUS[status].bar}`} style={{ width: `${width}%` }} />
      </div>
      <span className={`w-12 shrink-0 text-right text-[11px] tabular-nums ${status === 'over' ? 'font-semibold text-red-700' : 'text-gray-500'}`}>{Math.round(percent)} %</span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-gray-500">
      <Icon name="chart" className="h-8 w-8 text-gray-300" />
      <p className="max-w-md text-[13px]">{text}</p>
    </div>
  )
}
