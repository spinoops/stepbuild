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
  DEMO_CONTEXT,
  DEMO_CHAPTERS,
  DEMO_COLLABORATORS,
  DEMO_DOCUMENTS,
  DEMO_PROJECTS,
  DOCUMENT_TYPES,
  documentSteps,
} from '@/lib/demo'
import type { DemoPosition } from '@/lib/demo'
import { fmtAmount, fmtDate } from '@/lib/format'
import { toast } from '@/lib/toast'

const TABS = ['En-tête document', 'Textes document', 'Paramètres', 'Détail document', 'Conditions', 'Récapitulation', 'Complément']
const LEVELS = [1, 2, 3, 4]
const TVA = 8.1

const DOC_STATUS = [
  { value: 'en_cours', label: '1-EC · En cours', rowClass: 'bg-white' },
  { value: 'envoye', label: '2-ENV · Envoyé', rowClass: 'bg-amber-50' },
  { value: 'accepte', label: '3-ACC · Accepté', rowClass: 'bg-bb-green' },
]

type Row = DemoPosition & { id: string; amount: number | null }

const COLUMNS: GridColumn<Row>[] = [
  { key: 'level', header: 'Niv.', value: (r) => `PO${r.level}`, width: 50, cellClass: (r) => (r.level === 1 ? 'font-semibold text-gray-500' : 'text-gray-400') },
  { key: 'code', header: 'Code', value: (r) => r.code.split('.')[0], width: 45 },
  { key: 'pos', header: 'N° p…', value: (r) => r.code, width: 80 },
  { key: 'description', header: 'Description', value: (r) => r.description, width: 620, wrap: true, cellClass: (r) => (r.level === 1 ? 'font-semibold' : '') },
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
  const { projectId, documentId } = DEMO_CONTEXT
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

  const steps = documentSteps(doc)

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
          <StandardTools newLabel="Nouvelle position" />
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
          <span className="mr-1 text-[12px] text-gray-500">Niveau</span>
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setMaxLevel(level)}
              className={`h-7 w-7 rounded-md text-[13px] transition ${
                maxLevel === level ? 'bg-primary-600 font-medium text-white' : 'text-gray-600 hover:bg-gray-100'
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
          title="Étapes"
          nav={[
            { icon: 'tree', label: 'Étapes et modèles', active: true },
            { icon: 'image', label: 'Images' },
          ]}
        >
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Étapes du devis</div>
          <p className="mt-1 text-[12px] text-gray-400">
            Les rapports journaliers, la régie et la facture se rattachent à ces étapes.
          </p>
          <ul className="mt-2 space-y-0.5">
            {steps.map((step) => (
              <li key={step.code}>
                <button
                  type="button"
                  onClick={() => setChapter(chapter === step.code ? null : step.code)}
                  className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition ${
                    chapter === step.code ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="w-6 shrink-0 text-[12px] text-gray-400">{step.code}</span>
                  <span className="truncate">{step.label}</span>
                  <span className="ml-auto rounded-full bg-gray-100 px-1.5 text-[11px] text-gray-500">{step.positions}</span>
                </button>
              </li>
            ))}
            {steps.length === 0 && <li className="px-2 text-[13px] text-gray-400">Aucune étape : ajoutez-en depuis les modèles.</li>}
          </ul>

          <div className="mt-5 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Modèles d'étapes</div>
          <p className="mt-1 text-[12px] text-gray-400">Cliquez sur un modèle pour l'ajouter au devis avec ses articles.</p>
          <div className="mt-2 py-1">
            <Tree
              nodes={treeNodes}
              selectedId={null}
              onSelect={(node) => toast(`Ajout de l'étape « ${node.label} » au devis : phase 3.`, 'info')}
            />
          </div>
          <BbCheckbox label="Synchroniser avec le catalogue" defaultChecked className="mt-3" />
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <TabStrip tabs={TABS} active={tab} onChange={setTab} className="shrink-0 px-4" />

        {tab === 'Détail document' && (
          <DataGrid
            className="min-h-0 flex-1"
            columns={COLUMNS}
            rows={rows}
            rowKey={(row) => row.id}
            rowClass={(row, index) => (row.level === 1 ? 'bg-gray-100' : index % 2 ? 'bg-bb-row' : 'bg-white')}
            selectedKey={selectedId}
            onSelect={(row) => setSelectedId(row.id)}
          />
        )}

        {tab === 'En-tête document' && (
          <div className="flex min-h-0 flex-1 gap-12 overflow-auto p-5">
            <form key={doc.id} className="w-[440px] shrink-0 space-y-2">
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
              <form key={`${doc.id}-${addressTab}`} className="space-y-2 pt-4">
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
                  <span className="w-[120px] shrink-0 pt-1.5 text-[13px] text-gray-500">Remarque</span>
                  <BbTextarea rows={3} className="w-72" />
                </div>
              </form>
            </div>
          </div>
        )}

        {tab === 'Récapitulation' && (
          <div className="p-5">
            <table className="w-[560px] border-collapse overflow-hidden rounded-lg text-[13px]">
              <thead>
                <tr className="bg-bb-ribbon text-[12px] font-semibold text-gray-500">
                  <th className="border-b border-gray-200 px-3 py-2 text-left">Chapitre</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-right">Montant CHF</th>
                </tr>
              </thead>
              <tbody>
                {chapterTotals.map((item, index) => (
                  <tr key={item.code} className={index % 2 ? 'bg-bb-row' : 'bg-white'}>
                    <td className="border-b border-gray-100 px-3 py-1.5">
                      <span className="mr-2 text-gray-400">{item.code}</span>
                      {item.label}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-1.5 text-right">{fmtAmount(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td className="border-b border-gray-200 px-3 py-1.5">Total HT</td>
                  <td className="border-b border-gray-200 px-3 py-1.5 text-right">{fmtAmount(total)}</td>
                </tr>
                <tr>
                  <td className="border-b border-gray-100 px-3 py-1.5 text-gray-600">TVA {TVA} %</td>
                  <td className="border-b border-gray-100 px-3 py-1.5 text-right">{fmtAmount(tva)}</td>
                </tr>
                <tr className="bg-primary-50 font-semibold text-primary-800">
                  <td className="px-3 py-2">Total TTC</td>
                  <td className="px-3 py-2 text-right">{fmtAmount(total + tva)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {!['Détail document', 'En-tête document', 'Récapitulation'].includes(tab) && (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            Onglet « {tab} » : disponible avec le module devis (phase 3).
          </div>
        )}
      </div>
    </Workspace>
  )
}
