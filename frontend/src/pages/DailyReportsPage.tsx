import { useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolButton, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import GridPager from '@/components/baubit/GridPager'
import { BbInput, BbSelect, BbTextarea } from '@/components/baubit/Form'
import HoursGrid from '@/components/reports/HoursGrid'
import ReportFilesTab from '@/components/reports/ReportFilesTab'
import ReportHeaderForm, { REPORT_FORM_ID } from '@/components/reports/ReportHeaderForm'
import ReportItemsTab from '@/components/reports/ReportItemsTab'
import { Icon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import { useCollaborators, useCreateDailyReport, useDailyReport, useDailyReportActions, useDailyReports, useWorkTypes } from '@/hooks/useDailyReports'
import { useProjectDocuments } from '@/hooks/useDocuments'
import { SAVE_LABELS } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import { useProjectOptions } from '@/hooks/useProjects'
import { useSelection } from '@/hooks/useSelection'
import { EMPTY_QUERY } from '@/lib/crud'
import type { GridQuery } from '@/lib/crud'
import { fmtAmount, fmtDate } from '@/lib/format'
import { canSeePrices } from '@/lib/roles'
import { REPORT_STATUSES } from '@/lib/status'
import { toast } from '@/lib/toast'
import { setProject, useWorkspace } from '@/lib/workspaceStore'
import type { DailyReport, ReportStatus } from '@/types'

const TABS = [
  { key: 'salaire', label: 'Salaire' },
  { key: 'f2', label: 'Matériaux' },
  { key: 'f3', label: 'Machines' },
  { key: 'f4', label: 'Mat. exploitation' },
  { key: 'f5', label: 'Outillage' },
  { key: 'f6', label: 'Tiers' },
  { key: 'events', label: 'Evénements' },
  { key: 'files', label: 'Fichiers' },
  { key: 'photos', label: 'Photos' },
]

/**
 * Rapports journaliers : liste du projet courant à gauche, en-tête du rapport, grille des heures sur
 * les étapes du devis, puis ressources, événements, fichiers et photos. Même logique que BauBit.
 */
export default function DailyReportsPage() {
  const { user } = useAuth()
  const showPrices = canSeePrices(user)
  const { projectId } = useWorkspace()
  const { selectedId, select } = useSelection()
  const [query, setQuery] = useState<GridQuery>(EMPTY_QUERY)
  const [month, setMonth] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tab, setTab] = useState('Salaire')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saving, setSaving] = useState(false)

  const list = useDailyReports(query, { project_id: projectId, month: month || null, status: statusFilter || null })
  const report = useDailyReport(selectedId)
  const actions = useDailyReportActions(selectedId ?? 0)
  const collaborators = useCollaborators()
  const workTypes = useWorkTypes()
  const projects = useProjectOptions()
  const create = useCreateDailyReport()
  const documents = useProjectDocuments(report.data?.project_id ?? null, showPrices)

  const rows = list.data?.data ?? []
  const current = report.data ?? null
  const project = projects.data?.find((item) => item.id === projectId) ?? null
  const index = current ? rows.findIndex((row) => row.id === current.id) : -1

  function createReport() {
    if (!projectId) {
      toast('Choisissez d’abord un projet dans la barre du haut.', 'info')
      return
    }
    create.mutate(
      { projectId },
      {
        onSuccess: (created) => {
          select(created.id)
          setTab('Salaire')
          if (!created.document_id) {
            toast('Ce projet n’a pas encore de devis : les heures ne pourront pas être saisies par étape.', 'info')
          }
        },
        onError: () => toast("Le rapport n'a pas pu être créé.", 'error'),
      },
    )
  }

  function deleteReport() {
    if (!current || !window.confirm(`Supprimer le rapport ${current.number} du ${fmtDate(current.date)} ?`)) {
      return
    }
    void actions
      .remove()
      .then(() => {
        select(null)
        toast('Rapport supprimé.', 'success')
      })
      .catch(() => toast('Suppression impossible.', 'error'))
  }

  const columns: GridColumn<DailyReport>[] = [
    { key: 'date', header: 'Date', value: (r) => fmtDate(r.date, true), width: 96 },
    { key: 'number', header: 'N°', value: (r) => r.number, width: 44 },
    ...(!projectId ? [{ key: 'project', header: 'Projet', value: (r: DailyReport) => r.project?.number ?? '', width: 80, noFilter: true }] : []),
    { key: 'responsible', header: 'Responsable', value: (r) => r.responsible ?? '', width: 120, noFilter: true },
    {
      key: 'status',
      header: 'Statut',
      value: (r) => REPORT_STATUSES[r.status].label,
      width: 100,
      noFilter: true,
      render: (r) => <Badge className={REPORT_STATUSES[r.status].className}>{REPORT_STATUSES[r.status].label}</Badge>,
    },
    { key: 'total_hours', header: 'Heures', value: (r) => r.total_hours || null, type: 'number', width: 60, noFilter: true },
  ]

  const listHours = rows.reduce((sum, row) => sum + row.total_hours, 0)
  const listAmount = rows.reduce((sum, row) => sum + (row.total_amount ?? 0), 0)
  const statusLeft = showPrices
    ? `Montant total : ${fmtAmount(listAmount)} CHF   |   Heures : ${fmtAmount(listHours)}`
    : `Heures : ${fmtAmount(listHours)}`
  const statusRight = current
    ? [
        showPrices ? `Rapport : ${fmtAmount(current.total_amount ?? 0)} CHF` : null,
        `Heures du rapport : ${fmtAmount(current.total_hours)}`,
        saving ? 'Enregistrement…' : SAVE_LABELS[saveState],
      ]
        .filter(Boolean)
        .join('   |   ')
    : undefined

  const readOnly = !current?.can_edit
  const tabLabel = project ? `Rapports journaliers : ${project.number} - ${project.designation1}` : 'Rapports journaliers'

  return (
    <Workspace
      asideWidth={430}
      tabLabel={tabLabel}
      entries={list.data?.meta.total ?? null}
      statusLeft={statusLeft}
      statusRight={statusRight}
      toolbar={
        <>
          <StandardTools newLabel="Nouveau rapport" onNew={createReport} formId={REPORT_FORM_ID} onDelete={deleteReport} canDelete={Boolean(current?.can_edit)} />
          <ToolButton icon="arrow" title="Rapport précédent" tone="primary" disabled={index <= 0} onClick={() => select(rows[index - 1].id)} />
          <ToolButton icon="arrow" title="Rapport suivant" tone="primary" disabled={index < 0 || index >= rows.length - 1} onClick={() => select(rows[index + 1].id)} />
          <ToolSep />
          <ToolButton
            icon="users"
            title="Reprendre l'équipe du rapport précédent"
            tone="primary"
            disabled={readOnly}
            onClick={() => void actions.copyTeam().then(() => toast('Équipe du rapport précédent reprise.', 'success')).catch(() => toast("Aucune équipe n'a pu être reprise.", 'error'))}
          />
          <ToolButton
            icon="check"
            title={current?.status === 'en_cours' ? 'Passer le rapport en contrôle' : 'Rapport déjà transmis au contrôle'}
            tone="success"
            disabled={!current || current.status !== 'en_cours' || readOnly}
            onClick={() => void actions.updateHeader({ status: 'en_controle' }).then(() => toast('Rapport transmis au contrôle.', 'success')).catch(() => toast('Changement de statut impossible.', 'error'))}
          />
        </>
      }
      aside={
        <AsidePanel
          title="Rapports"
          nav={[
            { icon: 'table', label: projectId ? 'Rapports du projet' : 'Tous les rapports', active: true },
            { icon: 'folder', label: 'Tous les projets', onClick: () => setProject(null) },
          ]}
        >
          <div className="mt-1 flex items-center gap-2">
            <BbInput type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" title="Mois" />
            <BbSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-0 flex-1">
              <option value="">Tous les statuts</option>
              {(Object.keys(REPORT_STATUSES) as ReportStatus[]).map((key) => (
                <option key={key} value={key}>
                  {REPORT_STATUSES[key].code} · {REPORT_STATUSES[key].label}
                </option>
              ))}
            </BbSelect>
          </div>
          <div className="mb-2 mt-3 text-[13px] font-semibold text-gray-800">
            {project ? `${project.number} · ${project.designation1}` : 'Tous les projets'}
          </div>
          <DataGrid
            className="rounded-lg border border-gray-200"
            columns={columns}
            rows={rows}
            rowKey={(row) => String(row.id)}
            rowClass={(row) => REPORT_STATUSES[row.status].rowClass}
            selectedKey={selectedId === null ? null : String(selectedId)}
            onSelect={(row) => select(row.id)}
            query={{ filters: query.filters, sort: query.sort }}
            onQueryChange={(state) => setQuery({ ...state, page: 1 })}
            emptyText={list.isLoading ? 'Chargement…' : projectId ? 'Aucun rapport pour ce projet.' : 'Aucun rapport.'}
          />
          <GridPager meta={list.data?.meta} onPage={(page) => setQuery({ ...query, page })} loading={list.isFetching} />
        </AsidePanel>
      }
    >
      {current ? (
        <div className="flex h-full flex-col">
          <ReportHeaderForm
            key={current.id}
            report={current}
            actions={actions}
            collaborators={collaborators.data ?? []}
            documents={documents.data ?? []}
            showPrices={showPrices}
            onStateChange={setSaveState}
          />
          <TabStrip tabs={TABS.map((item) => item.label)} active={tab} onChange={setTab} className="shrink-0 px-4" />

          {tab === 'Salaire' && (
            <>
              {current.document && (
                <div className="flex h-9 shrink-0 items-center gap-2 bg-primary-50/60 px-4 text-[12px] text-primary-800">
                  <Icon name="file" className="h-3.5 w-3.5" />
                  Étapes issues du devis <span className="font-semibold">{current.document.number}</span>
                  <span className="text-primary-600">
                    · {current.steps?.length ?? 0} étape{(current.steps?.length ?? 0) > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <HoursGrid
                key={current.id}
                report={current}
                actions={actions}
                collaborators={collaborators.data ?? []}
                workTypes={workTypes.data ?? []}
                readOnly={readOnly}
                showPrices={showPrices}
                onSaving={setSaving}
              />
            </>
          )}
          {['Matériaux', 'Machines', 'Mat. exploitation', 'Outillage', 'Tiers'].includes(tab) && (
            <ReportItemsTab
              key={`${current.id}-${tab}`}
              report={current}
              family={Number(TABS.find((item) => item.label === tab)?.key.slice(1))}
              actions={actions}
              readOnly={readOnly}
              showPrices={showPrices}
              onSaving={setSaving}
            />
          )}
          {tab === 'Evénements' && (
            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="text-[12px] text-gray-500">Incidents, visites, livraisons, décisions prises sur le chantier.</p>
              <BbTextarea
                key={current.id}
                defaultValue={current.events ?? ''}
                disabled={readOnly}
                rows={10}
                className="w-full max-w-[800px] disabled:border-transparent disabled:bg-transparent"
                onBlur={(event) => {
                  const events = event.target.value.trim() || null
                  if (events !== (current.events ?? null)) {
                    setSaving(true)
                    void actions.updateHeader({ events }).catch(() => toast("Les événements n'ont pas pu être enregistrés.", 'error')).finally(() => setSaving(false))
                  }
                }}
              />
            </div>
          )}
          {tab === 'Fichiers' && <ReportFilesTab key={`${current.id}-files`} report={current} actions={actions} mode="files" readOnly={readOnly} />}
          {tab === 'Photos' && <ReportFilesTab key={`${current.id}-photos`} report={current} actions={actions} mode="photos" readOnly={readOnly} />}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-500">
          <Icon name="clipboard" className="h-8 w-8 text-gray-300" />
          <p className="font-medium text-gray-700">{report.isLoading ? 'Chargement du rapport…' : 'Aucun rapport sélectionné.'}</p>
          {!report.isLoading && (
            <p className="max-w-md text-[13px]">
              {projectId
                ? 'Choisissez un rapport dans la liste ou créez le rapport du jour avec « Nouveau rapport ».'
                : 'Choisissez un projet dans la barre du haut pour saisir un rapport.'}
            </p>
          )}
        </div>
      )}
    </Workspace>
  )
}
