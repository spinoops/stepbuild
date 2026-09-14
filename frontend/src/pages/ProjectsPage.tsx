import { useState } from 'react'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import { BbCheckbox, BbInput, BbSelect, Field, StatusSelect } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import { DEMO_COMPANY, DEMO_PROJECTS } from '@/lib/demo'
import type { DemoProject } from '@/lib/demo'
import { PROJECT_STATUSES } from '@/lib/status'
import { setProject, useWorkspace } from '@/lib/workspaceStore'
import type { ProjectStatus } from '@/types'

const TABS = ['Général', 'Compléments', 'Adresses', 'Conditions', 'Délais', 'Compétence', 'Journal', 'Photos de référence']

const STATUS_OPTIONS = (Object.keys(PROJECT_STATUSES) as ProjectStatus[]).map((key) => ({
  value: key,
  label: PROJECT_STATUSES[key].code,
  rowClass: PROJECT_STATUSES[key].rowClass,
}))

const COLUMNS: GridColumn<DemoProject>[] = [
  { key: 'number', header: 'N° de projet', value: (p) => p.number, width: 90 },
  { key: 'designation1', header: 'Désignation 1', value: (p) => p.designation1, width: 380 },
  { key: 'client', header: '01-Destinataire', value: (p) => p.client, width: 200 },
  { key: 'street', header: 'Rue', value: (p) => `${p.street} ${p.streetNo}`.trim(), width: 170 },
  { key: 'zip', header: 'NPA', value: (p) => p.zip, width: 50 },
  { key: 'city', header: 'Lieu', value: (p) => p.city, width: 110 },
  { key: 'status', header: 'Statut', value: (p) => PROJECT_STATUSES[p.status].code, width: 80 },
  { key: 'active', header: 'Actif', value: (p) => p.active, type: 'bool', width: 45 },
  { key: 'model', header: 'Mod…', value: () => false, type: 'bool', width: 45 },
  { key: 'company', header: 'Entreprise', value: () => DEMO_COMPANY, width: 220 },
  { key: 'mutation', header: 'Date mutation', value: (p) => p.mutation, width: 120 },
  { key: 'instructions', header: 'Instructions facture', value: () => '', width: 130 },
]

/** Projets : fiche en haut (onglets Général…), liste colorée par statut en bas — comme BauBit. */
export default function ProjectsPage() {
  const { projectId } = useWorkspace()
  const [tab, setTab] = useState('Général')
  const [status, setStatus] = useState<ProjectStatus | null>(null)

  const selectedId = projectId ?? DEMO_PROJECTS[0].id
  const project = DEMO_PROJECTS.find((item) => item.id === selectedId) ?? DEMO_PROJECTS[0]
  const currentStatus = status ?? project.status

  function select(row: DemoProject) {
    setProject(row.id)
    setStatus(null)
  }

  return (
    <Workspace
      demo
      entries={DEMO_PROJECTS.length}
      totals="Brut: 0.00 CHF   Net: 0.00 CHF"
      toolbar={
        <>
          <StandardTools />
          <ToolMenu icon="import" label="Import" />
          <ToolMenu icon="export" label="Export" />
          <ToolSep />
          <ToolMenu label="Extras" />
        </>
      }
      aside={
        <AsidePanel nav={[{ icon: 'qr', label: 'QR code', active: true }]}>
          <div className="mt-1 text-[15px] text-gray-800">QR code</div>
          <div className="mt-2 flex h-64 items-center justify-center border border-bb-line bg-white">
            <Icon name="qr" className="h-28 w-28 text-gray-800" strokeWidth={1.5} />
          </div>
          <p className="mt-2 text-[11px] text-gray-500">QR code du projet (phase 2).</p>
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-bb-line bg-white px-2 pb-4 pt-1">
          <TabStrip tabs={TABS} active={tab} onChange={setTab} />
          {tab === 'Général' ? (
            <form key={project.id} className="mt-3 grid grid-cols-[max-content_max-content] gap-x-10 gap-y-1.5">
              <Field label="N° de projet">
                <BbInput defaultValue={project.number} className="w-64" />
              </Field>
              <div className="flex items-center gap-10">
                <Field label="Actif" labelWidth={50}>
                  <BbCheckbox defaultChecked={project.active} />
                </Field>
                <Field label="Modèles" labelWidth={60}>
                  <BbCheckbox />
                </Field>
              </div>

              <Field label="Entreprise" className="col-span-2">
                <BbSelect defaultValue={DEMO_COMPANY} className="w-[560px]">
                  <option>{DEMO_COMPANY}</option>
                </BbSelect>
              </Field>
              <Field label="Désignation 1" className="col-span-2">
                <BbInput defaultValue={project.designation1} className="w-[560px]" />
              </Field>
              <Field label="Désignation 2" className="col-span-2">
                <BbInput defaultValue={project.designation2} className="w-[560px]" />
              </Field>

              <Field label="Rue">
                <BbInput defaultValue={project.street} className="w-40" />
                <span className="ml-3 text-gray-700">N°</span>
                <BbInput defaultValue={project.streetNo} className="w-16" />
              </Field>
              <Field label="Téléphone" labelWidth={90}>
                <BbInput defaultValue={project.phone} className="w-48" />
              </Field>

              <Field label="Pays">
                <BbInput className="w-20" />
                <span className="ml-3 text-gray-700">NPA</span>
                <BbSelect defaultValue={project.zip} className="w-20">
                  <option>{project.zip}</option>
                </BbSelect>
              </Field>
              <Field label="Fax" labelWidth={90}>
                <BbInput className="w-48" />
              </Field>

              <Field label="Lieu">
                <BbSelect defaultValue={project.city} className="w-64">
                  <option>{project.city}</option>
                </BbSelect>
              </Field>
              <Field label="Mobile" labelWidth={90}>
                <BbInput className="w-48" />
              </Field>

              <Field label="N° contrat" className="col-span-2">
                <BbInput defaultValue={project.contractNo} className="w-64" />
              </Field>
              <Field label="Unité d'imputation" className="col-span-2">
                <BbInput className="w-64" />
              </Field>
              <Field label="Statut" className="col-span-2 mt-1">
                <StatusSelect
                  options={STATUS_OPTIONS}
                  value={currentStatus}
                  onChange={(value) => setStatus(value as ProjectStatus)}
                  className="w-64"
                />
              </Field>
            </form>
          ) : (
            <div className="mt-3 flex h-[268px] items-center justify-center text-gray-500">
              Onglet « {tab} » : disponible en phase 2 (fiche projet complète).
            </div>
          )}
        </div>

        <DataGrid
          className="min-h-0 flex-1"
          columns={COLUMNS}
          rows={DEMO_PROJECTS}
          rowKey={(row) => row.id}
          rowClass={(row) => PROJECT_STATUSES[row.status].rowClass}
          selectedKey={selectedId}
          onSelect={select}
        />
      </div>
    </Workspace>
  )
}
