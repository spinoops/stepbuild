import { useMemo, useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolButton, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import { BbInput, BbSelect, BbTextarea, Field, StatusSelect } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import {
  DEMO_COLLABORATORS,
  DEMO_EXTRA_COLUMNS,
  DEMO_PROJECTS,
  DEMO_REPORTS,
  DEMO_WORK_TYPES,
  WEATHER_OPTIONS,
  collaboratorName,
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
  label: REPORT_STATUSES[key].code,
  rowClass: REPORT_STATUSES[key].rowClass,
}))

const LIST_COLUMNS: GridColumn<DemoReport>[] = [
  { key: 'date', header: 'Date', value: (r) => fmtDate(r.date, true), width: 92 },
  { key: 'number', header: 'Numéro', value: (r) => r.number, width: 60 },
  { key: 'resp', header: 'Responsable', value: (r) => collaboratorName(r.responsableId), width: 120 },
  { key: 'status', header: 'Statut', value: (r) => REPORT_STATUSES[r.status].code, width: 60 },
  { key: 'regie', header: 'Régie', value: (r) => r.regie, type: 'bool', width: 40 },
  { key: 'exp', header: 'Exp…', value: () => false, type: 'bool', width: 40 },
]

interface HourLine {
  id: string
  name: string
  base: number
  hours: Record<string, number>
  total: number
}

const HOUR_CODES = DEMO_WORK_TYPES.map((type) => type.code)

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
    ...DEMO_WORK_TYPES.map<GridColumn<HourLine>>((type) => ({
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
      cellClass: () => 'bg-[#d9d9d9]',
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
      totals={showPrices ? 'Brut: 11’490.00 CHF   Net: 12’420.69 CHF' : undefined}
      toolbar={
        <>
          <StandardTools />
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
            className="mt-1.5 flex h-6 w-full items-center gap-2 border border-bb-line bg-white px-1 text-[12px]"
          >
            <Icon name="filter" className="h-3.5 w-3.5 text-bb-blue" />
            <span className="flex-1 text-center">Filtre types de travail</span>
          </button>
          <div className="mt-3 text-[16px] text-gray-800">Tous les rapports journaliers</div>
          <DataGrid
            className="mt-1 max-h-[420px] border border-bb-line"
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
          <form key={report.id} className="shrink-0 space-y-1.5 px-3 pb-4 pt-3">
            <div className="flex items-center gap-10">
              <Field label="Numéro" labelWidth={80}>
                <BbInput defaultValue={report.number} readOnly className="w-48" />
              </Field>
              <Field label="Date" labelWidth={70}>
                <BbInput defaultValue={fmtDate(report.date, true)} className="w-52" />
                <button type="button" className="px-0.5 text-gray-500" title="Jour précédent">‹</button>
                <button type="button" className="px-0.5 text-gray-500" title="Jour suivant">›</button>
              </Field>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-[80px] shrink-0 pt-1 text-gray-700">Remarque</span>
              <BbTextarea defaultValue={report.remark} rows={8} className="w-[570px] text-[13px]" />
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

          <TabStrip tabs={TABS} active={tab} onChange={setTab} className="shrink-0 px-3" />

          {tab === 'Salaire' ? (
            <DataGrid
              className="min-h-0 flex-1"
              columns={hourColumns}
              rows={lines}
              rowKey={(row) => row.id}
              footer={
                <tr className="text-[12px]">
                  <td className="border-r border-t border-bb-line" />
                  <td className="border-r border-t border-bb-line" />
                  {showPrices && <td className="border-r border-t border-bb-line" />}
                  {DEMO_WORK_TYPES.map((type) => (
                    <td key={type.code} className="border-r border-t border-bb-line px-1.5 py-1 text-right">
                      {fmtAmount(columnTotal(type.code))}
                    </td>
                  ))}
                  <td className="border-r border-t border-bb-line bg-[#d9d9d9] px-1.5 py-1 text-right">
                    {fmtAmount(reportHours)}
                  </td>
                  {DEMO_EXTRA_COLUMNS.map((type) => (
                    <td key={type.code} className="border-r border-t border-bb-line px-1.5 py-1 text-right">
                      {fmtAmount(columnTotal(type.code), 0)}
                    </td>
                  ))}
                </tr>
              }
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-500">
              Onglet « {tab} » : saisie disponible en phase 3.
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-gray-500">
          Aucun rapport journalier pour le projet sélectionné.
        </div>
      )}
    </Workspace>
  )
}
