import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Workspace from '@/components/baubit/Workspace'
import { ToolButton, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import { BbInput, BbSelect } from '@/components/baubit/Form'
import AbsenceDialog from '@/components/hours/AbsenceDialog'
import type { AbsenceDialogState } from '@/components/hours/AbsenceDialog'
import { Icon } from '@/components/icons'
import { useHoursControlMatrix, useHoursControlSummary, useValidateMonth } from '@/hooks/useHoursControl'
import { dayAbbr, daysInMonth, fmtAmount, isWeekend } from '@/lib/format'
import { REPORT_STATUSES } from '@/lib/status'
import { toast } from '@/lib/toast'
import { setProject } from '@/lib/workspaceStore'
import type { AbsenceType, HoursControlCollaborator, ReportStatus } from '@/types'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

const CELL_STATUS: Record<ReportStatus, string> = {
  en_cours: 'bg-bb-red font-medium text-red-800',
  en_controle: 'bg-bb-green font-medium text-green-800',
  facture: 'bg-bb-blue-light font-medium text-primary-800',
}

const ABSENCE_SHORT: Record<AbsenceType, string> = {
  vacances: 'V',
  maladie: 'M',
  accident: 'A',
  ferie: 'F',
  ecole: 'E',
  militaire: 'PC',
  autre: '?',
}

function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(year, index - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string): string {
  const [year, index] = month.split('-').map(Number)
  return `${MONTHS[index - 1]} ${year}`
}

function isoDay(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, '0')}`
}

/**
 * Contrôle des heures : collaborateurs du mois à gauche, matrice projets × jours à droite, construite
 * depuis les rapports journaliers. Couleur des cellules = statut du rapport (rouge en cours, vert en
 * contrôle, bleu facturé). Absences saisies sur la ligne « Vacances / absences ». Même logique que BauBit.
 */
export default function HoursControlPage() {
  const navigate = useNavigate()
  // Mois et collaborateur dans l'URL (?mois=2026-08&collaborateur=3) : lien direct et retour arrière.
  const [params, setParams] = useSearchParams()
  const month = /^\d{4}-\d{2}$/.test(params.get('mois') ?? '') ? (params.get('mois') as string) : new Date().toISOString().slice(0, 7)
  const chosenId = Number(params.get('collaborateur')) || null
  const setMonth = (value: string) => setParams({ mois: value, ...(chosenId ? { collaborateur: String(chosenId) } : {}) }, { replace: true })
  const setCollaboratorId = (id: number) => setParams({ mois: month, collaborateur: String(id) }, { replace: true })
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('active')
  const [absence, setAbsence] = useState<AbsenceDialogState | null>(null)

  const summary = useHoursControlSummary(month)
  const validate = useValidateMonth()

  const [year, monthIndex] = month.split('-').map(Number)
  const days = useMemo(() => Array.from({ length: daysInMonth(year, monthIndex) }, (_, index) => index + 1), [year, monthIndex])

  const collaborators = useMemo(() => {
    const rows = summary.data?.data ?? []
    if (filter === 'pending') return rows.filter((row) => row.pending > 0)
    if (filter === 'active') return rows.filter((row) => row.is_active || row.hours > 0)
    return rows
  }, [summary.data, filter])

  // Sélection par défaut : premier collaborateur de la liste.
  const collaboratorId = chosenId ?? collaborators[0]?.id ?? null
  const matrix = useHoursControlMatrix(collaboratorId, month)

  const current = collaborators.find((row) => row.id === collaboratorId) ?? summary.data?.data.find((row) => row.id === collaboratorId) ?? null
  const data = matrix.data && matrix.data.collaborator.id === collaboratorId && matrix.data.month === month ? matrix.data : null
  const dayHours = data?.day_hours ?? summary.data?.day_hours ?? 9

  const workDay = (day: number) => (data?.projects ?? []).reduce((sum, project) => sum + (project.cells[String(day)]?.hours ?? 0), 0)
  const absenceDay = (day: number) => data?.absences[String(day)]?.hours ?? 0
  const workTotal = (data?.projects ?? []).reduce((sum, project) => sum + project.total, 0)
  const absenceTotal = days.reduce((sum, day) => sum + absenceDay(day), 0)
  const weekTotal = (day: number) => {
    let sum = 0
    for (let d = Math.max(1, day - 6); d <= day; d += 1) {
      sum += workDay(d) + absenceDay(d)
    }
    return sum
  }
  const pendingCells = (data?.projects ?? []).reduce((sum, project) => sum + Object.values(project.cells).filter((cell) => cell.status === 'en_cours').length, 0)

  function openReport(projectId: number, reportIds: number[]) {
    setProject(projectId)
    navigate(`/rapports?id=${reportIds[0]}`)
  }

  function validateMonth() {
    if (!current) return
    if (!window.confirm(`Valider les heures de ${current.name} pour ${monthLabel(month)} ?\nLes rapports encore en cours où ${current.name} a des heures passent « en contrôle ».`)) {
      return
    }
    validate.mutate(
      { collaboratorId: current.id, month },
      {
        onSuccess: (count) => toast(count ? `${count} rapport${count > 1 ? 's' : ''} passé${count > 1 ? 's' : ''} en contrôle.` : 'Aucun rapport en cours ce mois.', count ? 'success' : 'info'),
        onError: () => toast('La validation a échoué.', 'error'),
      },
    )
  }

  const columns: GridColumn<HoursControlCollaborator>[] = [
    { key: 'number', header: 'N°', value: (c) => c.number, width: 48 },
    { key: 'last_name', header: 'Nom', value: (c) => c.last_name, width: 110 },
    { key: 'first_name', header: 'Prénom', value: (c) => c.first_name, width: 90 },
    { key: 'hours', header: 'Heures', value: (c) => c.hours || null, type: 'number', width: 58, noFilter: true },
    { key: 'absence_hours', header: 'Abs.', value: (c) => c.absence_hours || null, type: 'number', width: 50, noFilter: true },
    { key: 'pending', header: 'À valider', value: (c) => c.pending || null, type: 'number', decimals: 0, width: 62, noFilter: true },
  ]

  const dayHeader = 'border-b border-gray-200 px-1 py-1.5 text-center text-[12px] font-semibold leading-tight text-gray-500'
  const rowCell = 'h-8 border-b border-gray-100 px-1.5 text-right tabular-nums'
  const absenceTypes = data?.absence_types ?? ({} as Record<AbsenceType, string>)

  return (
    <Workspace
      tabLabel={current ? `Contrôle des heures - ${current.name}` : 'Contrôle des heures'}
      entries={collaborators.length}
      statusLeft={data ? `Heures de travail : ${fmtAmount(workTotal)}   |   Absences : ${fmtAmount(absenceTotal)}   |   Total : ${fmtAmount(workTotal + absenceTotal)}` : undefined}
      statusRight={data ? (pendingCells ? `${pendingCells} jour${pendingCells > 1 ? 's' : ''} à valider` : 'Tout est validé') : undefined}
      toolbar={
        <>
          <ToolButton icon="check" title="Valider les heures du mois (rapports en cours → en contrôle)" tone="success" disabled={!current || !pendingCells || validate.isPending} onClick={validateMonth} />
          <ToolButton
            icon="calendar"
            title="Saisir des vacances ou une absence"
            tone="primary"
            disabled={!current}
            onClick={() => current && setAbsence({ collaboratorId: current.id, collaboratorName: current.name, from: isoDay(month, 1) })}
          />
          <ToolButton icon="refresh" title="Actualiser" tone="primary" onClick={() => void summary.refetch().then(() => matrix.refetch())} />
          <ToolSep />
          <ToolButton icon="print" title="Imprimer (phase 6)" />
          <ToolMenu icon="export" label="Export" />
        </>
      }
    >
      <div className="flex h-full">
        <div className="flex w-[430px] shrink-0 flex-col border-r border-gray-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <span className="w-[60px] text-[13px] text-gray-600">Mois</span>
            <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-md px-2 text-gray-500 hover:bg-gray-100" title="Mois précédent">
              ‹
            </button>
            <BbInput type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-40" aria-label="Mois" />
            <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="rounded-md px-2 text-gray-500 hover:bg-gray-100" title="Mois suivant">
              ›
            </button>
            <span className="text-[13px] font-medium text-gray-800">{monthLabel(month)}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-[60px] text-[13px] text-gray-600">Filtre</span>
            <BbSelect value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-56">
              <option value="active">Collaborateurs actifs</option>
              <option value="pending">Heures à valider</option>
              <option value="all">Tous les collaborateurs</option>
            </BbSelect>
          </div>
          <DataGrid
            className="mt-3 min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200"
            columns={columns}
            rows={collaborators}
            rowKey={(row) => String(row.id)}
            rowClass={(row) => (row.pending > 0 ? 'bg-amber-50 text-amber-900' : row.is_active ? 'bg-white' : 'bg-white text-gray-400')}
            selectedKey={collaboratorId === null ? null : String(collaboratorId)}
            onSelect={(row) => setCollaboratorId(row.id)}
            emptyText={summary.isLoading ? 'Chargement…' : 'Aucun collaborateur.'}
          />
          <p className="mt-2 text-[12px] text-gray-400">Ligne ambre : des rapports du mois sont encore en cours.</p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center gap-4 border-b border-gray-200 px-3 text-[12px] text-gray-500">
            <span className="font-medium text-gray-700">{current ? `${current.name} · ${monthLabel(month)}` : 'Choisissez un collaborateur'}</span>
            <span className="ml-auto flex items-center gap-3">
              <Legend className="bg-bb-red" label={REPORT_STATUSES.en_cours.label} />
              <Legend className="bg-bb-green" label={REPORT_STATUSES.en_controle.label} />
              <Legend className="bg-bb-blue-light" label={REPORT_STATUSES.facture.label} />
              <Legend className="bg-amber-100" label="Absence" />
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {!data ? (
              <div className="flex h-full items-center justify-center text-[13px] text-gray-400">{matrix.isLoading ? 'Chargement…' : 'Aucune donnée.'}</div>
            ) : (
              <table className="w-max border-collapse text-[13px]">
                <thead className="sticky top-0 z-10 bg-bb-ribbon">
                  <tr>
                    <th className={`${dayHeader} w-[400px] text-left`}>Projet / Désignation</th>
                    {days.map((day) => (
                      <th key={day} className={`${dayHeader} w-11 ${isWeekend(year, monthIndex, day) ? 'bg-gray-100 text-gray-400' : ''}`}>
                        {day}
                        <br />
                        {dayAbbr(year, monthIndex, day)}
                      </th>
                    ))}
                    <th className={`${dayHeader} w-16`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((project) => (
                    <tr key={project.id} className="bg-white">
                      <td className="h-8 whitespace-nowrap border-b border-gray-100 px-3">
                        <span className="font-medium text-gray-800">{project.number}</span> · {project.designation1}
                      </td>
                      {days.map((day) => {
                        const cell = project.cells[String(day)]
                        return (
                          <td key={day} className={`${rowCell} ${cell ? CELL_STATUS[cell.status] : isWeekend(year, monthIndex, day) ? 'bg-gray-50' : ''}`}>
                            {cell ? (
                              <button
                                type="button"
                                onClick={() => openReport(project.id, cell.report_ids)}
                                className="w-full text-right hover:underline"
                                title={`${REPORT_STATUSES[cell.status].label} · ouvrir le rapport`}
                              >
                                {fmtAmount(cell.hours)}
                              </button>
                            ) : (
                              ''
                            )}
                          </td>
                        )
                      })}
                      <td className={`${rowCell} bg-bb-ribbon font-medium`}>{fmtAmount(project.total)}</td>
                    </tr>
                  ))}
                  {data.projects.length === 0 && (
                    <tr>
                      <td colSpan={days.length + 2} className="h-8 border-b border-gray-100 px-3 text-gray-400">
                        Aucune heure saisie ce mois dans les rapports journaliers.
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-100 font-medium">
                    <td className="h-8 border-b border-gray-200 px-3">Total heures de travail</td>
                    {days.map((day) => (
                      <td key={day} className={rowCell}>
                        {workDay(day) ? fmtAmount(workDay(day)) : ''}
                      </td>
                    ))}
                    <td className={rowCell}>{fmtAmount(workTotal)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="h-8 border-b border-gray-100 px-3 text-gray-600">
                      Vacances / absences en h
                      <span className="ml-2 text-[11px] text-gray-400">clic sur un jour pour saisir</span>
                    </td>
                    {days.map((day) => {
                      const entry = data.absences[String(day)]
                      return (
                        <td key={day} className={`${rowCell} p-0 ${entry ? 'bg-amber-100 text-amber-900' : isWeekend(year, monthIndex, day) ? 'bg-gray-50' : ''}`}>
                          <button
                            type="button"
                            onClick={() =>
                              current && setAbsence({ collaboratorId: current.id, collaboratorName: current.name, from: isoDay(month, day), existing: entry ?? null })
                            }
                            className="h-8 w-full px-1.5 text-right hover:bg-amber-50"
                            title={entry ? `${absenceTypes[entry.type] ?? entry.type}${entry.note ? ` · ${entry.note}` : ''}` : 'Saisir une absence'}
                          >
                            {entry ? (
                              <>
                                <span className="mr-1 text-[10px] text-amber-700">{ABSENCE_SHORT[entry.type]}</span>
                                {fmtAmount(entry.hours)}
                              </>
                            ) : (
                              ''
                            )}
                          </button>
                        </td>
                      )
                    })}
                    <td className={rowCell}>{absenceTotal ? fmtAmount(absenceTotal) : ''}</td>
                  </tr>
                  <tr className="bg-gray-100 font-medium">
                    <td className="h-8 border-b border-gray-200 px-3">Total heures</td>
                    {days.map((day) => {
                      const total = workDay(day) + absenceDay(day)
                      return (
                        <td key={day} className={`${rowCell} ${total > dayHours + 0.01 ? 'text-accent-700' : ''}`} title={total > dayHours + 0.01 ? `Plus de ${dayHours} h` : undefined}>
                          {total ? fmtAmount(total) : ''}
                        </td>
                      )
                    })}
                    <td className={rowCell}>{fmtAmount(workTotal + absenceTotal)}</td>
                  </tr>
                  <tr className="bg-gray-50 text-gray-600">
                    <td className="h-8 border-b border-gray-100 px-3">Total semaine</td>
                    {days.map((day) => {
                      const sunday = dayAbbr(year, monthIndex, day) === 'Di' || day === days.length
                      return (
                        <td key={day} className={rowCell}>
                          {sunday && weekTotal(day) ? fmtAmount(weekTotal(day)) : ''}
                        </td>
                      )
                    })}
                    <td className={rowCell}>{fmtAmount(workTotal + absenceTotal)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
          <div className="flex h-8 shrink-0 items-center gap-2 border-t border-gray-200 px-3 text-[12px] text-gray-400">
            <Icon name="clock" className="h-3.5 w-3.5" />
            Journée de {dayHours} h · un clic sur une cellule ouvre le rapport journalier du jour · la validation passe les rapports en contrôle.
          </div>
        </div>
      </div>
      <AbsenceDialog state={absence} types={absenceTypes} dayHours={dayHours} onClose={() => setAbsence(null)} />
    </Workspace>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-3 w-3 rounded-sm border border-gray-200 ${className}`} />
      {label}
    </span>
  )
}
