import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { ToolButton, ToolSep } from '@/components/baubit/Toolbar'
import { BbInput, BbSelect } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import { useApplyMargin, useCostControl } from '@/hooks/useCostControl'
import type { ApplyMarginInput, ControlStatus, ControlStep, CostControlFilters } from '@/hooks/useCostControl'
import { toast } from '@/lib/toast'
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
  const applyMargin = useApplyMargin(filters)
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

  /** Marge sur le coût brut → prix client des lignes concernées (rapports facturés exclus). */
  function changeMargin(input: ApplyMarginInput) {
    applyMargin.mutate(input, {
      onSuccess: ({ updated, locked }) =>
        toast(
          `${updated} ligne${updated > 1 ? 's' : ''} au prix client coût + ${input.markup_percent} %` + (locked ? ` · ${locked} ligne${locked > 1 ? 's' : ''} facturée${locked > 1 ? 's' : ''} inchangée${locked > 1 ? 's' : ''}` : '') + '.',
          'success',
        ),
      onError: () => toast("La marge n'a pas pu être appliquée.", 'error'),
    })
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

              <div className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Marge client sur tout le chantier</div>
              <div className="mt-2 rounded-lg border border-gray-200 p-3">
                <MarginControl
                  value={data.totals.margin_percent}
                  cost={data.totals.actual.cost}
                  busy={applyMargin.isPending}
                  onApply={(percent) => changeMargin({ scope: 'all', markup_percent: percent })}
                />
                <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                  Fixe le prix client de toutes les lignes des rapports non facturés à coût brut + marge. Le tarif régie de l'entreprise reste tel quel.
                </p>
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
                  <th className={`${HEAD} w-52 text-left`} title="Marge du prix client sur le coût brut ; la tirette l'applique à toutes les lignes de l'étape (rapports non facturés)">
                    Marge client
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
                    <StepRows
                      key={key}
                      row={row}
                      isOther={isOther}
                      expanded={expanded}
                      busy={applyMargin.isPending}
                      onToggle={() => toggle(key)}
                      onOpenReport={openReport}
                      onMargin={(percent) => changeMargin(isOther ? { scope: 'other', markup_percent: percent } : { scope: 'step', document_step_id: row.id, markup_percent: percent })}
                    />
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
                  <td className="px-2 py-2 text-[12px] font-normal text-gray-500">{data.totals.margin_percent !== null ? `${data.totals.margin_percent} % sur le coût` : ''}</td>
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
  busy: boolean
  onToggle: () => void
  onOpenReport: (id: number) => void
  onMargin: (percent: number) => void
}

/** Une étape (ligne colorée) et, dépliés, les rapports journaliers qui l'ont alimentée. */
function StepRows({ row, isOther, expanded, busy, onToggle, onOpenReport, onMargin }: StepRowsProps) {
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
        <td className="px-2 py-1" onClick={(event) => event.stopPropagation()}>
          {row.actual.cost > 0 && <MarginControl value={row.margin_percent} cost={row.actual.cost} lockedCost={row.locked_cost} busy={busy} onApply={onMargin} compact />}
        </td>
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

interface MarginControlProps {
  /** Marge réalisée aujourd'hui (prix client / coût brut), null sans coût. */
  value: number | null
  cost: number
  lockedCost?: number
  busy: boolean
  compact?: boolean
  onApply: (percent: number) => void
}

/**
 * Tirette de marge : on la déplace (ou on tape le pourcentage), le prix client prévu s'affiche, et la
 * marge s'applique aux lignes quand on relâche la tirette ou qu'on valide le champ (Entrée, sortie).
 */
function MarginControl({ value, cost, lockedCost = 0, busy, compact = false, onApply }: MarginControlProps) {
  const current = value ?? 0
  const [draft, setDraft] = useState<number | null>(null)
  const shown = draft ?? current
  const dirty = draft !== null && Math.abs(draft - current) >= 0.05
  const projected = Math.round(cost * (1 + shown / 100) * 20) / 20
  const allLocked = lockedCost > 0 && lockedCost >= cost - 0.005

  function commit() {
    if (dirty && !allLocked) {
      onApply(Math.round(shown * 10) / 10)
    }
    setDraft(null)
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'flex-wrap'}`} title={allLocked ? 'Tous les rapports de cette étape sont facturés : prix client figés' : undefined}>
      <input
        type="range"
        min={-20}
        max={100}
        step={1}
        value={Math.min(100, Math.max(-20, shown))}
        disabled={busy || allLocked}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={(event) => (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Enter') && commit()}
        onBlur={commit}
        aria-label="Marge client en pour-cent du coût brut"
        className={`${compact ? 'w-24' : 'flex-1'} accent-primary-600 disabled:opacity-40`}
      />
      <span className="flex items-center gap-0.5">
        <input
          type="number"
          min={-100}
          max={500}
          step={1}
          value={Math.round(shown * 10) / 10}
          disabled={busy || allLocked}
          onChange={(event) => setDraft(event.target.value === '' ? 0 : Number(event.target.value))}
          onKeyDown={(event) => event.key === 'Enter' && commit()}
          onBlur={commit}
          aria-label="Marge client"
          className={`h-7 w-14 rounded-md border border-gray-300 px-1 text-right text-[12px] tabular-nums outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:opacity-40 ${
            dirty ? 'border-primary-400 bg-primary-50' : ''
          }`}
        />
        <span className="text-[11px] text-gray-500">%</span>
      </span>
      {!compact && (
        <span className="text-[12px] text-gray-600">
          → client <span className={`font-semibold tabular-nums ${dirty ? 'text-primary-800' : 'text-gray-800'}`}>{fmtAmount(projected)}</span>
        </span>
      )}
      {compact && dirty && <span className="text-[11px] tabular-nums text-primary-800">→ {fmtAmount(projected)}</span>}
      {lockedCost > 0 && !allLocked && compact && (
        <Icon name="clock" className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-label="Une partie des rapports est facturée : ces lignes ne bougent pas" />
      )}
    </div>
  )
}
