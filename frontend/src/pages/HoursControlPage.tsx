import { useState } from 'react'
import Workspace from '@/components/baubit/Workspace'
import { StandardTools, ToolButton, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import { BbInput, BbSelect, Field } from '@/components/baubit/Form'
import { DEMO_COLLABORATORS, DEMO_HOURS, DEMO_MONTH, DEMO_PROJECTS, DEMO_VACATIONS } from '@/lib/demo'
import type { DemoCollaborator } from '@/lib/demo'
import { dayAbbr, daysInMonth, fmtAmount, isWeekend } from '@/lib/format'

const { year, month } = DEMO_MONTH
const DAYS = Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1)

const COLLAB_COLUMNS: GridColumn<DemoCollaborator>[] = [
  { key: 'number', header: 'N° collaborat…', value: (c) => c.number, width: 80 },
  { key: 'lastName', header: 'Nom', value: (c) => c.lastName, width: 110 },
  { key: 'firstName', header: 'Prénom', value: (c) => c.firstName, width: 80 },
  { key: 'status', header: 'Statut', value: () => '', width: 60 },
]

function hasPending(collaboratorId: string): boolean {
  return DEMO_HOURS.some((entry) => entry.collaboratorId === collaboratorId && !entry.validated)
}

/** Contrôle des heures : filtres et collaborateurs à gauche, matrice projets × jours à droite. */
export default function HoursControlPage() {
  const [collaboratorId, setCollaboratorId] = useState(DEMO_COLLABORATORS[0].id)
  const [mode, setMode] = useState<'mois' | 'semaine' | 'periode'>('mois')

  const collaborator = DEMO_COLLABORATORS.find((item) => item.id === collaboratorId) ?? DEMO_COLLABORATORS[0]
  const entries = DEMO_HOURS.filter((entry) => entry.collaboratorId === collaboratorId)
  const vacationDays = DEMO_VACATIONS.find((item) => item.collaboratorId === collaboratorId)?.days ?? []

  const projectIds = Array.from(new Set(entries.map((entry) => entry.projectId)))
  const projects = DEMO_PROJECTS.filter((project) => projectIds.includes(project.id))

  const cell = (projectId: string, day: number) =>
    entries.find((entry) => entry.projectId === projectId && entry.day === day)
  const dayTotal = (day: number) => entries.filter((entry) => entry.day === day).reduce((sum, e) => sum + e.hours, 0)
  const vacation = (day: number) => (vacationDays.includes(day) ? 9 : 0)
  const weekTotal = (day: number) => {
    // Total de la semaine se terminant ce dimanche (ou au dernier jour du mois).
    let sum = 0
    for (let d = Math.max(1, day - 6); d <= day; d += 1) {
      sum += dayTotal(d) + vacation(d)
    }
    return sum
  }
  const workTotal = entries.reduce((sum, entry) => sum + entry.hours, 0)
  const vacationTotal = vacationDays.length * 9

  const dayHeader = 'border-b border-gray-200 px-1 py-1.5 text-center text-[12px] font-semibold leading-tight text-gray-500'
  const rowCell = 'h-8 border-b border-gray-100 px-2 text-right'

  return (
    <Workspace
      demo
      entries={DEMO_COLLABORATORS.length}
      tabLabel={`Contrôle des heures - ${collaborator.lastName} ${collaborator.firstName}`}
      toolbar={
        <>
          <StandardTools newLabel="Saisir des heures" />
          <ToolButton icon="refresh" title="Actualiser" tone="primary" />
          <ToolButton icon="save" title="Valider les heures" tone="success" />
          <ToolButton icon="calendar" title="Vacances / absences" tone="primary" />
          <ToolSep />
          <ToolMenu icon="export" label="Export" />
        </>
      }
    >
      <div className="flex h-full">
        <div className="flex w-[380px] shrink-0 flex-col border-r border-gray-200 bg-white p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="flex w-[90px] items-center gap-1.5 text-gray-600">
                <input type="radio" checked={mode === 'mois'} onChange={() => setMode('mois')} />
                Mois
              </label>
              <BbInput defaultValue={DEMO_MONTH.label} className="w-56" disabled={mode !== 'mois'} />
              <span className="text-gray-400">‹ ›</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex w-[90px] items-center gap-1.5 text-gray-600">
                <input type="radio" checked={mode === 'semaine'} onChange={() => setMode('semaine')} />
                Semaine
              </label>
              <BbInput defaultValue="35/2026 (24.08.2026 - 30.08.2026)" className="w-56" disabled={mode !== 'semaine'} />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex w-[90px] items-center gap-1.5 text-gray-600">
                <input type="radio" checked={mode === 'periode'} onChange={() => setMode('periode')} />
                Période
              </label>
              <BbInput defaultValue="01.08.2026" className="w-[108px]" disabled={mode !== 'periode'} />
              <BbInput defaultValue="31.08.2026" className="w-[108px]" disabled={mode !== 'periode'} />
            </div>
            <Field label="Compétence projet" labelWidth={100}>
              <BbSelect className="w-56">
                <option />
              </BbSelect>
            </Field>
            <Field label="Filtre projet" labelWidth={100}>
              <BbSelect className="w-56">
                <option />
              </BbSelect>
            </Field>
            <Field label="Equipe" labelWidth={100}>
              <BbSelect className="w-56">
                <option />
              </BbSelect>
            </Field>
          </div>
          <DataGrid
            className="mt-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200"
            columns={COLLAB_COLUMNS}
            rows={DEMO_COLLABORATORS}
            rowKey={(row) => row.id}
            rowClass={(row) => (hasPending(row.id) ? 'bg-amber-50 text-amber-800' : 'bg-white')}
            selectedKey={collaboratorId}
            onSelect={(row) => setCollaboratorId(row.id)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-gray-200 px-3">
            <span className="text-gray-500">Filtre</span>
            <BbSelect className="w-56" defaultValue="all">
              <option value="all">Tous les collaborateurs</option>
              <option value="pending">Heures à valider</option>
            </BbSelect>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-max border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-bb-ribbon">
                <tr>
                  <th className={`${dayHeader} w-[420px] text-left`}>Projet / Désignation</th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className={`${dayHeader} w-11 ${isWeekend(year, month, day) ? 'bg-gray-100 text-gray-400' : ''}`}
                    >
                      {day}
                      <br />
                      {dayAbbr(year, month, day)}
                    </th>
                  ))}
                  <th className={`${dayHeader} w-16`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="bg-white">
                    <td className="h-8 whitespace-nowrap border-b border-gray-100 px-3">
                      <span className="font-medium text-gray-800">{project.number}</span> · {project.designation1}
                    </td>
                    {DAYS.map((day) => {
                      const entry = cell(project.id, day)
                      return (
                        <td
                          key={day}
                          className={`${rowCell} ${
                            entry
                              ? entry.validated
                                ? 'bg-bb-green font-medium text-green-800'
                                : 'bg-bb-red font-medium text-red-800'
                              : isWeekend(year, month, day)
                                ? 'bg-gray-50'
                                : ''
                          }`}
                        >
                          {entry ? fmtAmount(entry.hours) : ''}
                        </td>
                      )
                    })}
                    <td className={`${rowCell} bg-bb-ribbon font-medium`}>
                      {fmtAmount(entries.filter((e) => e.projectId === project.id).reduce((s, e) => s + e.hours, 0))}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-medium">
                  <td className="h-8 border-b border-gray-200 px-3">Total heures de travail</td>
                  {DAYS.map((day) => (
                    <td key={day} className={rowCell}>
                      {dayTotal(day) ? fmtAmount(dayTotal(day)) : ''}
                    </td>
                  ))}
                  <td className={rowCell}>{fmtAmount(workTotal)}</td>
                </tr>
                <tr className="bg-white">
                  <td className="h-8 border-b border-gray-100 px-3 text-gray-600">Vacances en H</td>
                  {DAYS.map((day) => (
                    <td key={day} className={rowCell}>
                      {vacation(day) ? fmtAmount(vacation(day)) : ''}
                    </td>
                  ))}
                  <td className={rowCell}>{fmtAmount(vacationTotal)}</td>
                </tr>
                <tr className="bg-gray-100 font-medium">
                  <td className="h-8 border-b border-gray-200 px-3">Total heures</td>
                  {DAYS.map((day) => {
                    const total = dayTotal(day) + vacation(day)
                    return (
                      <td key={day} className={rowCell}>
                        {total ? fmtAmount(total) : ''}
                      </td>
                    )
                  })}
                  <td className={rowCell}>{fmtAmount(workTotal + vacationTotal)}</td>
                </tr>
                <tr className="bg-gray-50 text-gray-600">
                  <td className="h-8 border-b border-gray-100 px-3">Total semaine (temps trajet incl.)</td>
                  {DAYS.map((day) => {
                    const sunday = dayAbbr(year, month, day) === 'Di' || day === DAYS.length
                    return (
                      <td key={day} className={rowCell}>
                        {sunday && weekTotal(day) ? fmtAmount(weekTotal(day)) : ''}
                      </td>
                    )
                  })}
                  <td className={rowCell}>{fmtAmount(workTotal + vacationTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Workspace>
  )
}
