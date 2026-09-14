import { useState } from 'react'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolButton, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import Tree from '@/components/baubit/Tree'
import { BbCheckbox, BbInput, BbSelect, BbTextarea, Field, SectionTitle, StatusSelect } from '@/components/baubit/Form'
import {
  DEMO_ADDRESSES,
  DEMO_CHAPTERS,
  DEMO_COLLABORATORS,
  DEMO_DOCUMENTS,
  DEMO_PROJECTS,
  DOCUMENT_TYPES,
} from '@/lib/demo'
import type { DemoPosition } from '@/lib/demo'
import { fmtAmount, fmtDate } from '@/lib/format'
import { useWorkspace } from '@/lib/workspaceStore'

const TABS = ['En-tête document', 'Textes document', 'Paramètres', 'Détail document', 'Conditions', 'Récapitulation', 'Complément']
const LEVELS = [1, 2, 3, 4]
const TVA = 8.1

const DOC_STATUS = [
  { value: 'en_cours', label: '1-EC', rowClass: 'bg-white' },
  { value: 'envoye', label: '2-ENV', rowClass: 'bg-bb-yellow' },
  { value: 'accepte', label: '3-ACC', rowClass: 'bg-bb-green' },
]

type Row = DemoPosition & { id: string; amount: number | null }

const COLUMNS: GridColumn<Row>[] = [
  { key: 'level', header: 'G. li.', value: (r) => `PO${r.level}`, width: 45, cellClass: (r) => (r.level === 1 ? 'font-bold' : '') },
  { key: 'code', header: 'Code', value: (r) => r.code.split('.')[0], width: 45 },
  { key: 'pos', header: 'N° p…', value: (r) => r.code, width: 80 },
  { key: 'description', header: 'Description', value: (r) => r.description, width: 620, wrap: true, cellClass: (r) => (r.level === 1 ? 'font-bold' : '') },
  { key: 'unit', header: 'Un.', value: (r) => r.unit, width: 60 },
  { key: 'qty', header: 'Quantité', value: (r) => r.qty, type: 'number', width: 70 },
  { key: 'price', header: 'Prix CHF', value: (r) => r.price, type: 'number', width: 80 },
  { key: 'amount', header: 'Montant CHF', value: (r) => r.amount, type: 'number', width: 90 },
  { key: 'gq', header: 'GQ', value: (r) => (r.price !== null ? 'A' : ''), width: 30 },
  { key: 'remarks', header: 'Remarques internes', value: () => '', width: 200 },
  { key: 'workType', header: 'Type de travail', value: (r) => r.workType, width: 90 },
  { key: 'levelNo', header: 'Niveau', value: (r) => r.level, width: 50, align: 'right', noFilter: true },
  { key: 'category', header: 'Catégorie', value: () => '', width: 80 },
]

/** Documents (devis, acomptes, factures) : arborescence à gauche, en-tête / détail / récapitulation. */
export default function DocumentsPage() {
  const { projectId, documentId } = useWorkspace()
  const documents = DEMO_DOCUMENTS.filter((doc) => !projectId || doc.projectId === projectId)
  const doc = documents.find((item) => item.id === documentId) ?? documents[0] ?? DEMO_DOCUMENTS[0]
  const project = DEMO_PROJECTS.find((item) => item.id === doc.projectId)
  const address = DEMO_ADDRESSES.find((item) => project?.client.startsWith(item.lastName))

  const [tab, setTab] = useState('Détail document')
  const [maxLevel, setMaxLevel] = useState(4)
  const [chapter, setChapter] = useState<string | null>(null)
  const [addressTab, setAddressTab] = useState('Adresse destinataire')
  const [status, setStatus] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const rows: Row[] = doc.positions
    .map((position, index) => ({
      ...position,
      id: `${doc.id}-${index}`,
      amount: position.qty !== null && position.price !== null ? position.qty * position.price : null,
    }))
    .filter((row) => row.level <= maxLevel)
    .filter((row) => !chapter || row.code.startsWith(chapter))

  const total = doc.positions.reduce((sum, p) => sum + (p.qty ?? 0) * (p.price ?? 0), 0)
  const tva = total * (TVA / 100)

  const chapterTotals = DEMO_CHAPTERS.map((item) => ({
    ...item,
    amount: doc.positions
      .filter((p) => p.code.startsWith(item.code))
      .reduce((sum, p) => sum + (p.qty ?? 0) * (p.price ?? 0), 0),
  })).filter((item) => item.amount > 0)

  const treeNodes = DEMO_CHAPTERS.map((item) => ({
    id: item.code,
    label: `${item.code} - ${item.label}`,
    children: item.children?.map((child) => ({ id: `${item.code}.${child.code}`, label: `${child.code} - ${child.label}` })),
  }))

  return (
    <Workspace
      demo
      tabLabel={doc.label}
      entries={rows.length}
      totals={`Brut: ${fmtAmount(total)} CHF   Net: ${fmtAmount(total + tva)} CHF`}
      toolbar={
        <>
          <StandardTools />
          <ToolMenu icon="import" label="Import" />
          <ToolMenu icon="export" label="Export" />
          <ToolSep />
          <ToolButton icon="chevron" title="Position précédente" tone="primary" />
          <ToolButton icon="chevron" title="Position suivante" tone="primary" />
          <BbSelect className="ml-1 w-44" defaultValue="descriptif">
            <option value="descriptif">Article descriptif</option>
            <option value="libre">Texte libre</option>
          </BbSelect>
          <ToolSep />
          <span className="mr-1 text-gray-600">Niveau</span>
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setMaxLevel(level)}
              className={`h-6 w-6 rounded border text-[12px] ${
                maxLevel === level ? 'border-bb-blue bg-bb-select' : 'border-transparent hover:bg-blue-50'
              }`}
            >
              {level}
            </button>
          ))}
          <ToolSep />
          <ToolButton icon="sigma" title="Recalculer" tone="primary" />
          <ToolButton icon="print" title="Imprimer le document (PDF)" />
          <ToolButton icon="paperclip" title="Pièces jointes" />
        </>
      }
      aside={
        <AsidePanel
          nav={[
            { icon: 'tree', label: 'Structure arborescente', active: true },
            { icon: 'image', label: 'Images' },
          ]}
        >
          <div className="mt-1 text-[15px] text-gray-800">Structure arborescente</div>
          <div className="mt-2 border border-bb-line bg-white py-1">
            <Tree
              nodes={treeNodes}
              selectedId={chapter}
              onSelect={(node) => setChapter(chapter === node.id ? null : node.id)}
              defaultExpanded={['18']}
            />
          </div>
          <BbCheckbox label="Synchroniser" defaultChecked className="mt-2" />
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <TabStrip tabs={TABS} active={tab} onChange={setTab} className="shrink-0 px-1 pt-1" />

        {tab === 'Détail document' && (
          <DataGrid
            className="min-h-0 flex-1"
            columns={COLUMNS}
            rows={rows}
            rowKey={(row) => row.id}
            rowClass={(row, index) => (row.level === 1 ? 'bg-bb-yellow' : index % 2 ? 'bg-bb-row' : 'bg-white')}
            selectedKey={selectedId}
            onSelect={(row) => setSelectedId(row.id)}
          />
        )}

        {tab === 'En-tête document' && (
          <div className="flex min-h-0 flex-1 gap-8 overflow-auto p-3">
            <form key={doc.id} className="w-[430px] shrink-0 space-y-1.5">
              <SectionTitle>Informations documents</SectionTitle>
              <Field label="Type">
                <BbSelect className="w-72" defaultValue="Libre">
                  <option>Libre</option>
                  <option>Depuis les rapports validés</option>
                </BbSelect>
              </Field>
              <Field label="Type de document">
                <BbSelect className="w-72" defaultValue={doc.type}>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.code} - {type.label}
                    </option>
                  ))}
                </BbSelect>
              </Field>
              <Field label="N° de document">
                <BbInput defaultValue={doc.number} readOnly className="w-72" />
              </Field>
              <div className="h-12" />
              <Field label="Date">
                <BbInput defaultValue={fmtDate(doc.date)} className="w-24" />
                <span className="ml-3 text-gray-700">Initiales</span>
                <BbInput defaultValue={doc.initials} className="w-24" />
              </Field>
              <Field label="Statut">
                <StatusSelect options={DOC_STATUS} value={status ?? doc.status} onChange={setStatus} className="w-72" />
              </Field>
              <Field label="Total brut CHF">
                <BbInput value={fmtAmount(total)} readOnly className="ml-auto w-36 text-right" />
              </Field>
              <Field label="Total net CHF">
                <BbInput value={fmtAmount(total + tva)} readOnly className="ml-auto w-36 text-right" />
              </Field>
              <Field label="Paiement CHF">
                <BbSelect className="w-28">
                  <option />
                </BbSelect>
                <BbInput className="ml-auto w-36 text-right" />
              </Field>
              <div className="h-4" />
              <Field label="Période TVA">
                <BbSelect className="w-28">
                  <option />
                </BbSelect>
                <span className="text-gray-500">-</span>
                <BbSelect className="w-36">
                  <option />
                </BbSelect>
              </Field>
              <div className="h-4" />
              <Field label="Unité d'imputation">
                <BbInput className="w-72" />
              </Field>
              <Field label="Date de prestation">
                <BbInput defaultValue={fmtDate(doc.date)} className="w-28" />
              </Field>
              <Field label="Responsable">
                <BbSelect className="w-72" defaultValue={doc.responsableId}>
                  {DEMO_COLLABORATORS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.lastName} {item.firstName}
                    </option>
                  ))}
                </BbSelect>
              </Field>
            </form>

            <div className="w-[480px] shrink-0">
              <SectionTitle>Adresses</SectionTitle>
              <TabStrip tabs={['Adresse destinataire', '2ème adresse']} active={addressTab} onChange={setAddressTab} />
              <form key={`${doc.id}-${addressTab}`} className="space-y-1.5 border border-t-0 border-bb-line p-3">
                <Field label="Adresse">
                  <BbSelect className="w-72" defaultValue={address?.id ?? ''}>
                    <option value="" />
                    {DEMO_ADDRESSES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.lastName} {item.firstName}, {item.city}
                      </option>
                    ))}
                  </BbSelect>
                </Field>
                <Field label="Titre">
                  <BbInput defaultValue={address?.title ?? ''} className="w-20" />
                  <span className="ml-4 text-gray-700">N° débiteurs</span>
                  <BbInput className="w-24" />
                </Field>
                <Field label="Nom">
                  <BbInput defaultValue={address?.lastName ?? ''} className="w-72" />
                </Field>
                <Field label="Prénom">
                  <BbInput defaultValue={address?.firstName ?? ''} className="w-72" />
                </Field>
                <Field label="Désignation">
                  <BbInput className="w-72" />
                </Field>
                <Field label="Département">
                  <BbInput className="w-72" />
                </Field>
                <Field label="Rue">
                  <BbInput defaultValue={address?.street ?? ''} className="w-52" />
                  <span className="text-gray-700">N°</span>
                  <BbInput defaultValue={address?.streetNo ?? ''} className="w-14" />
                </Field>
                <Field label="Case postale">
                  <BbInput className="w-72" />
                </Field>
                <Field label="Pays">
                  <BbInput className="w-14" />
                  <span className="ml-3 text-gray-700">NPA</span>
                  <BbInput defaultValue={address?.zip ?? ''} className="ml-auto w-24" />
                </Field>
                <Field label="Lieu">
                  <BbSelect className="w-72" defaultValue={address?.city ?? ''}>
                    <option>{address?.city ?? ''}</option>
                  </BbSelect>
                </Field>
                <Field label="eMail">
                  <BbInput defaultValue={address?.email ?? ''} className="w-72" />
                </Field>
                <div className="h-2" />
                <Field label="Personne de contact">
                  <BbSelect className="w-72">
                    <option />
                  </BbSelect>
                </Field>
                <Field label="Nom">
                  <BbInput className="w-72" />
                </Field>
                <Field label="eMail">
                  <BbInput className="w-72" />
                </Field>
                <Field label="eMail Cc">
                  <BbInput className="w-72" />
                </Field>
                <Field label="Form. politesse">
                  <BbInput className="w-72" />
                </Field>
                <div className="flex items-start gap-2">
                  <span className="w-[110px] shrink-0 pt-1 text-gray-700">Remarque</span>
                  <BbTextarea rows={3} className="w-72" />
                </div>
              </form>
            </div>
          </div>
        )}

        {tab === 'Récapitulation' && (
          <div className="p-4">
            <table className="w-[520px] border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#f4f4f4] text-bb-head">
                  <th className="border border-bb-line px-2 py-1 text-left font-normal">Chapitre</th>
                  <th className="border border-bb-line px-2 py-1 text-right font-normal">Montant CHF</th>
                </tr>
              </thead>
              <tbody>
                {chapterTotals.map((item, index) => (
                  <tr key={item.code} className={index % 2 ? 'bg-bb-row' : 'bg-white'}>
                    <td className="border border-bb-line px-2 py-0.5">
                      {item.code} {item.label}
                    </td>
                    <td className="border border-bb-line px-2 py-0.5 text-right">{fmtAmount(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-[#ececec] font-medium">
                  <td className="border border-bb-line px-2 py-0.5">Total HT</td>
                  <td className="border border-bb-line px-2 py-0.5 text-right">{fmtAmount(total)}</td>
                </tr>
                <tr>
                  <td className="border border-bb-line px-2 py-0.5">TVA {TVA} %</td>
                  <td className="border border-bb-line px-2 py-0.5 text-right">{fmtAmount(tva)}</td>
                </tr>
                <tr className="bg-[#d9d9d9] font-bold">
                  <td className="border border-bb-line px-2 py-0.5">Total TTC</td>
                  <td className="border border-bb-line px-2 py-0.5 text-right">{fmtAmount(total + tva)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {!['Détail document', 'En-tête document', 'Récapitulation'].includes(tab) && (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            Onglet « {tab} » : disponible en phase 5.
          </div>
        )}
      </div>
    </Workspace>
  )
}
