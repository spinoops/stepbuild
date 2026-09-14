import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolMenu, ToolPrimary, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import { BbCheckbox, BbInput, BbSelect, Field, StatusSelect } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import { DEMO_COMPANY, DEMO_DOCUMENTS, DEMO_PROJECTS, projectDevis, projectSteps } from '@/lib/demo'
import type { DemoProject } from '@/lib/demo'
import { PROJECT_STATUSES } from '@/lib/status'
import { setDocument, setProject, useWorkspace } from '@/lib/workspaceStore'
import type { ProjectStatus } from '@/types'

const TABS = ['Général', 'Compléments', 'Adresses', 'Conditions', 'Délais', 'Compétence', 'Journal', 'Photos de référence']

const STATUS_OPTIONS = (Object.keys(PROJECT_STATUSES) as ProjectStatus[]).map((key) => ({
  value: key,
  label: `${PROJECT_STATUSES[key].code} · ${PROJECT_STATUSES[key].label}`,
  rowClass: PROJECT_STATUSES[key].rowClass,
}))

const COLUMNS: GridColumn<DemoProject>[] = [
  { key: 'number', header: 'N° de projet', value: (p) => p.number, width: 90 },
  { key: 'designation1', header: 'Désignation 1', value: (p) => p.designation1, width: 380 },
  { key: 'client', header: '01-Destinataire', value: (p) => p.client, width: 200 },
  { key: 'street', header: 'Rue', value: (p) => `${p.street} ${p.streetNo}`.trim(), width: 170 },
  { key: 'zip', header: 'NPA', value: (p) => p.zip, width: 50 },
  { key: 'city', header: 'Lieu', value: (p) => p.city, width: 110 },
  {
    key: 'status',
    header: 'Statut',
    value: (p) => PROJECT_STATUSES[p.status].label,
    width: 100,
    render: (p) => <Badge className={PROJECT_STATUSES[p.status].className}>{PROJECT_STATUSES[p.status].label}</Badge>,
  },
  {
    key: 'devis',
    header: 'Devis',
    value: (p) => projectDevis(p.id)?.number ?? '',
    width: 130,
    render: (p) => {
      const devis = projectDevis(p.id)
      return devis ? (
        <span className="text-primary-700">{devis.number}</span>
      ) : (
        <span className="text-gray-400">Sans devis</span>
      )
    },
  },
  { key: 'active', header: 'Actif', value: (p) => p.active, type: 'bool', width: 45 },
  { key: 'model', header: 'Mod…', value: () => false, type: 'bool', width: 45 },
  { key: 'company', header: 'Entreprise', value: () => DEMO_COMPANY, width: 220 },
  { key: 'mutation', header: 'Date mutation', value: (p) => p.mutation, width: 120 },
  { key: 'instructions', header: 'Instructions facture', value: () => '', width: 130 },
]

/** Projets : fiche en haut (onglets Général…), liste colorée par statut en bas — comme BauBit. */
export default function ProjectsPage() {
  const { projectId } = useWorkspace()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Général')
  const [status, setStatus] = useState<ProjectStatus | null>(null)

  const selectedId = projectId ?? DEMO_PROJECTS[0].id
  const project = DEMO_PROJECTS.find((item) => item.id === selectedId) ?? DEMO_PROJECTS[0]
  const currentStatus = status ?? project.status
  const documents = DEMO_DOCUMENTS.filter((doc) => doc.projectId === project.id)
  const steps = projectSteps(project.id)

  function openDocument(documentId: string | null) {
    setProject(project.id)
    setDocument(documentId)
    navigate('/documents')
  }

  function select(row: DemoProject) {
    setProject(row.id)
    setStatus(null)
  }

  return (
    <Workspace
      demo
      entries={DEMO_PROJECTS.length}
      toolbar={
        <>
          <StandardTools newLabel="Nouveau projet" />
          <ToolMenu icon="import" label="Import" />
          <ToolMenu icon="export" label="Export" />
          <ToolSep />
          <ToolMenu label="Extras" />
        </>
      }
      aside={
        <AsidePanel
          title="Projet"
          nav={[
            { icon: 'file', label: 'Devis et documents', active: true },
            { icon: 'qr', label: 'QR code' },
          ]}
        >
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Devis du projet</div>
          <p className="mt-1 text-[12px] text-gray-400">
            Le devis fixe les étapes du chantier ; rapports, régie et facture en découlent.
          </p>
          {documents.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => openDocument(doc.id)}
                    className="flex w-full items-center gap-2 rounded-md border border-gray-200 px-2.5 py-2 text-left transition hover:border-primary-200 hover:bg-primary-50"
                  >
                    <Icon name="file" className="h-4 w-4 shrink-0 text-primary-600" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-gray-800">{doc.label}</span>
                      <span className="block text-[11px] text-gray-400">
                        {doc.type === 'DEV' ? 'Devis' : doc.type === 'FA' ? 'Facture' : 'Acompte'} · {doc.date.split('-').reverse().join('.')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-[12px] text-gray-500">
              Aucun devis pour ce projet.
            </div>
          )}
          <div className="mt-3">
            <ToolPrimary icon="fileplus" label={steps.length ? 'Nouveau document' : 'Créer le devis'} onClick={() => openDocument(null)} />
          </div>

          {steps.length > 0 && (
            <>
              <div className="mt-5 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
                Étapes du chantier
              </div>
              <ul className="mt-2 space-y-0.5 text-[13px] text-gray-700">
                {steps.map((step) => (
                  <li key={step.code} className="flex items-center gap-2 px-1">
                    <span className="w-6 text-[12px] text-gray-400">{step.code}</span>
                    <span className="truncate">{step.label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-gray-200 bg-white px-4 pb-5 pt-1">
          <TabStrip tabs={TABS} active={tab} onChange={setTab} />
          {tab === 'Général' ? (
            <form key={project.id} className="mt-4 grid grid-cols-[max-content_max-content] gap-x-12 gap-y-2">
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
            <div className="mt-4 flex h-[300px] items-center justify-center text-gray-400">
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
