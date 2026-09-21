import { useMemo, useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolButton, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import { BbInput, BbSelect, BbTextarea, Field, StatusSelect } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import {
  DEMO_COLLABORATORS,
  DEMO_EXTRA_COLUMNS,
  DEMO_PROJECTS,
  DEMO_REPORTS,
  WEATHER_OPTIONS,
  collaboratorName,
  projectDevis,
  projectSteps,
} from '@/lib/demo'
import type { DemoReport } from '@/lib/demo'
import { fmtAmount, fmtDate } from '@/lib/format'
import { canSeePrices } from '@/lib/roles'
import { REPORT_STATUSES } from '@/lib/status'
import { useWorkspace } from '@/lib/workspaceStore'
import type { ReportStatus } from '@/types'

const TABS = ['Salaire', 'Matériaux', 'Machines', 'Mat. exploitation', 'Outillage', 'Tiers', 'Evénements', 'Fichiers', 'Photos']

const STATUS_OPTIONS = (Object.keys(REPORT_STATUSES) as ReportStatus[]).map((key) => ({
  value: key,
  label: `${REPORT_STATUSES[key].code} · ${REPORT_STATUSES[key].label}`,
  rowClass: REPORT_STATUSES[key].rowClass,
}))

const LIST_COLUMNS: GridColumn<DemoReport>[] = [
  { key: 'date', header: 'Date', value: (r) => fmtDate(r.date, true), width: 92 },
  { key: 'number', header: 'Numéro', value: (r) => r.number, width: 60 },
  { key: 'resp', header: 'Responsable', value: (r) => collaboratorName(r.responsableId), width: 120 },
  {
    key: 'status',
    header: 'Statut',
    value: (r) => REPORT_STATUSES[r.status].label,
    width: 110,
    render: (r) => <Badge className={REPORT_STATUSES[r.status].className}>{REPORT_STATUSES[r.status].label}</Badge>,
  },
  { key: 'regie', header: 'Régie', value: (r) => r.regie, type: 'bool', width: 40 },
]

interface HourLine {
  id: string
  name: string
  base: number
  hours: Record<string, number>
  total: number
}

/** Rapports journaliers : liste à gauche, en-tête du rapport, grille des heures par type de travail. */
export default function DailyReportsPage() {
  const { user } = useAuth()
  const { projectId } = useWorkspace()
  const showPrices = canSeePrices(user)

  const reports = useMemo(
    () => DEMO_REPORTS.filter((report) => !projectId || report.projectId === projectId),
    [projectId],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState('Salaire')
  const [status, setStatus] = useState<ReportStatus | null>(null)

  const report = reports.find((item) => item.id === selectedId) ?? reports[0] ?? null
  const project = DEMO_PROJECTS.find((item) => item.id === (projectId ?? report?.projectId))

  // Les étapes du rapport sont celles du devis du projet : tout le suivi s'y rattache.
  const devis = project ? projectDevis(project.id) : null
  const steps = project ? projectSteps(project.id) : []
  const HOUR_CODES = steps.map((step) => step.code)

  const lines: HourLine[] = (report?.lines ?? []).map((line) => {
    const collaborator = DEMO_COLLABORATORS.find((item) => item.id === line.collaboratorId)
    const total = HOUR_CODES.reduce((sum, code) => sum + (line.hours[code] ?? 0), 0)
    return {
      id: line.collaboratorId,
      name: collaboratorName(line.collaboratorId),
      base: collaborator?.base ?? 0,
      hours: line.hours,
      total,
    }
  })

  const reportHours = lines.reduce((sum, line) => sum + line.total, 0)
  const reportAmount = lines.reduce((sum, line) => sum + line.total * line.base, 0)
  const allHours = reports.flatMap((item) => item.lines).reduce(
    (sum, line) => sum + HOUR_CODES.reduce((inner, code) => inner + (line.hours[code] ?? 0), 0),
    0,
  )
  const allAmount = reports
    .flatMap((item) => item.lines)
    .reduce((sum, line) => {
      const base = DEMO_COLLABORATORS.find((c) => c.id === line.collaboratorId)?.base ?? 0
      return sum + HOUR_CODES.reduce((inner, code) => inner + (line.hours[code] ?? 0), 0) * base
    }, 0)

  const columnTotal = (code: string) => lines.reduce((sum, line) => sum + (line.hours[code] ?? 0), 0)

  const hourColumns: GridColumn<HourLine>[] = [
    { key: 'name', header: 'Collaborateur', value: (l) => l.name, width: 130 },
    ...(showPrices
      ? [{ key: 'base', header: 'Base', value: (l: HourLine) => l.base, type: 'number' as const, width: 50 }]
      : []),
    ...steps.map<GridColumn<HourLine>>((type) => ({
      key: type.code,
      header: `${type.code} ${type.label}`,
      value: (l) => l.hours[type.code] ?? null,
      type: 'number',
      rotate: true,
      width: 46,
    })),
    {
      key: 'total',
      header: 'Total Rendement',
      value: (l) => l.total || null,
      type: 'number',
      width: 60,
      cellClass: () => 'bg-gray-100 font-medium',
      headerClass: 'whitespace-normal',
    },
    ...DEMO_EXTRA_COLUMNS.map<GridColumn<HourLine>>((type) => ({
      key: type.code,
      header: `${type.code} ${type.label}`,
      value: (l) => l.hours[type.code] ?? null,
      type: 'number',
      decimals: 0,
      rotate: true,
      width: 46,
    })),
  ]

  const statusLeft = showPrices
    ? `Montant total: ${fmtAmount(allAmount)} CHF   |   Heures sal.: ${fmtAmount(allHours)}`
    : `Heures sal.: ${fmtAmount(allHours)}`
  const statusRight = showPrices
    ? `Montant total rapport: ${fmtAmount(reportAmount)} CHF   |   Rapport h. sal.: ${fmtAmount(reportHours)}`
    : `Rapport h. sal.: ${fmtAmount(reportHours)}`

  return (
    <Workspace
      demo
      asideWidth={420}
      tabLabel={project ? `Rapports journaliers : ${project.number} - ${project.designation1}` : 'Rapports journaliers'}
      statusLeft={statusLeft}
      statusRight={statusRight}
      toolbar={
        <>
          <StandardTools newLabel="Nouveau rapport" />
          <ToolMenu icon="import" label="Import" />
          <ToolMenu icon="export" label="Export" />
          <ToolSep />
          <ToolButton icon="arrow" title="Rapport précédent" tone="primary" />
          <ToolButton icon="arrow" title="Rapport suivant" tone="primary" />
          <ToolSep />
          <ToolButton icon="table" title="Types de travail" tone="primary" />
          <ToolButton icon="save" title="Valider le rapport" tone="success" />
          <ToolButton icon="users" title="Copier l'équipe de la veille" tone="primary" />
          <ToolButton icon="paperclip" title="Fichiers joints" />
          <ToolSep />
          <ToolMenu label="Extras" />
        </>
      }
      aside={
        <AsidePanel
          nav={[
            { icon: 'calendar', label: 'Rapports journaliers par mois' },
            { icon: 'calendar', label: 'Rapports journaliers par semaine' },
            { icon: 'table', label: 'Tous les rapports journaliers', active: true },
            { icon: 'settings', label: 'Données de base' },
          ]}
        >
          <Field label="Recherche" labelWidth={60} className="mt-1">
            <BbInput className="flex-1" placeholder="" />
            <Icon name="search" className="h-4 w-4 text-bb-blue" />
          </Field>
          <button
            type="button"
            className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-2 text-[13px] text-gray-600 hover:bg-gray-50"
          >
            <Icon name="filter" className="h-4 w-4 text-gray-400" />
            Filtre types de travail
          </button>
          <div className="mb-2 mt-4 text-[13px] font-semibold text-gray-800">Tous les rapports journaliers</div>
          <DataGrid
            className="max-h-[420px] overflow-hidden rounded-lg border border-gray-200"
            columns={LIST_COLUMNS}
            rows={reports}
            rowKey={(row) => row.id}
            rowClass={(row) => REPORT_STATUSES[row.status].rowClass}
            selectedKey={report?.id ?? null}
            onSelect={(row) => {
              setSelectedId(row.id)
              setStatus(null)
            }}
            emptyText="Aucun rapport pour ce projet."
          />
        </AsidePanel>
      }
    >
      {report ? (
        <div className="flex h-full flex-col">
          <form key={report.id} className="shrink-0 space-y-2 px-4 pb-5 pt-4">
            <div className="flex items-center gap-10">
              <Field label="Numéro" labelWidth={80}>
                <BbInput defaultValue={report.number} readOnly className="w-48" />
              </Field>
              <Field label="Date" labelWidth={70}>
                <BbInput defaultValue={fmtDate(report.date, true)} className="w-52" />
                <button type="button" className="rounded-md px-1.5 text-gray-400 hover:bg-gray-100" title="Jour précédent">‹</button>
                <button type="button" className="rounded-md px-1.5 text-gray-400 hover:bg-gray-100" title="Jour suivant">›</button>
              </Field>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-[80px] shrink-0 pt-1.5 text-[13px] text-gray-500">Remarque</span>
              <BbTextarea defaultValue={report.remark} rows={6} className="w-[570px]" />
            </div>
            <div className="flex items-center gap-10">
              <Field label="Météo" labelWidth={80}>
                <BbSelect defaultValue={report.weather} className="w-48">
                  {WEATHER_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </BbSelect>
              </Field>
              <Field label="Temp. min/max" labelWidth={90}>
                <BbInput defaultValue={report.tempMin} className="w-12 text-right" />
                <BbInput defaultValue={report.tempMax} className="w-12 text-right" />
                <Icon name="sun" className="ml-2 h-4 w-4 text-amber-500" />
              </Field>
            </div>
            <div className="flex items-center gap-10">
              <Field label="Responsable" labelWidth={80}>
                <BbSelect defaultValue={report.responsableId} className="w-48">
                  {DEMO_COLLABORATORS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.lastName} {item.firstName}
                    </option>
                  ))}
                </BbSelect>
              </Field>
              <Field label="Statut" labelWidth={90}>
                <StatusSelect
                  options={STATUS_OPTIONS}
                  value={status ?? report.status}
                  onChange={(value) => setStatus(value as ReportStatus)}
                  className="w-64"
                />
              </Field>
            </div>
          </form>

          <TabStrip tabs={TABS} active={tab} onChange={setTab} className="shrink-0 px-4" />

          {tab === 'Salaire' && !devis ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-500">
              <Icon name="file" className="h-8 w-8 text-gray-300" />
              <p className="font-medium text-gray-700">Ce projet n'a pas encore de devis.</p>
              <p className="max-w-md text-center text-[13px]">
                Les heures se saisissent sur les étapes du devis. Créez d'abord le devis du projet, ses étapes
                apparaîtront ici en colonnes.
              </p>
            </div>
          ) : tab === 'Salaire' ? (
            <>
            <div className="flex h-9 shrink-0 items-center gap-2 bg-primary-50/60 px-4 text-[12px] text-primary-800">
              <Icon name="file" className="h-3.5 w-3.5" />
              Étapes issues du devis <span className="font-semibold">{devis?.number}</span>
              <span className="text-primary-600">· {steps.length} étape{steps.length > 1 ? 's' : ''}</span>
            </div>
            <DataGrid
              className="min-h-0 flex-1"
              columns={hourColumns}
              rows={lines}
              rowKey={(row) => row.id}
              footer={
                <tr className="text-[12px] text-gray-700">
                  <td className="border-t border-gray-200" />
                  <td className="border-t border-gray-200 px-3 py-2">Total</td>
                  {showPrices && <td className="border-t border-gray-200" />}
                  {steps.map((type) => (
                    <td key={type.code} className="border-t border-gray-200 px-3 py-2 text-right">
                      {columnTotal(type.code) ? fmtAmount(columnTotal(type.code)) : ''}
                    </td>
                  ))}
                  <td className="border-t border-gray-200 bg-gray-100 px-3 py-2 text-right font-semibold">
                    {fmtAmount(reportHours)}
                  </td>
                  {DEMO_EXTRA_COLUMNS.map((type) => (
                    <td key={type.code} className="border-t border-gray-200 px-3 py-2 text-right">
                      {columnTotal(type.code) ? fmtAmount(columnTotal(type.code), 0) : ''}
                    </td>
                  ))}
                </tr>
              }
            />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-400">
              Onglet « {tab} » : saisie disponible en phase 4.
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-gray-400">
          Aucun rapport journalier pour le projet sélectionné.
        </div>
      )}
    </Workspace>
  )
}
