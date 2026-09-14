import { useState } from 'react'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolButton, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import Tree from '@/components/baubit/Tree'
import { BbCheckbox, BbSelect } from '@/components/baubit/Form'
import { DEMO_ARTICLES, DEMO_CHAPTERS } from '@/lib/demo'
import type { DemoArticle } from '@/lib/demo'

const COLUMNS: GridColumn<DemoArticle>[] = [
  { key: 'chapter', header: '.', value: (a) => a.chapter, width: 32 },
  { key: 'code', header: '..', value: (a) => a.code, width: 36 },
  { key: 'sub', header: '…', value: (a) => a.sub, width: 36 },
  { key: 'description', header: 'Description', value: (a) => a.description, width: 320, wrap: true },
  { key: 'four', header: '4', value: () => '', width: 20, noFilter: true },
  { key: 'unit', header: 'Un.', value: (a) => a.unit, width: 50 },
  { key: 'purchase', header: 'Achat', value: (a) => a.purchase, type: 'number', width: 70 },
  { key: 'sale', header: 'Vente', value: (a) => a.sale, type: 'number', width: 80 },
  { key: 'codeCol', header: 'Code', value: () => '', width: 100 },
  { key: 'category', header: 'Catégorie', value: (a) => a.category, width: 100 },
  { key: 'workType', header: 'Type de travail', value: (a) => a.workType, width: 100 },
  { key: 'graphic', header: 'Graphi…', value: () => false, type: 'bool', width: 50 },
]

const TREE = DEMO_CHAPTERS.map((chapter) => ({
  id: chapter.code,
  label: `${chapter.code} - ${chapter.label}`,
  children: chapter.children?.map((child) => ({
    id: `${chapter.code}.${child.code}`,
    label: `${child.code} - ${child.label}`,
  })),
}))

/** Catalogue d'articles : arborescence par corps de métier à gauche, articles à droite. */
export default function CatalogPage() {
  const [chapter, setChapter] = useState<string | null>('02')
  const [sync, setSync] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const rows = sync && chapter ? DEMO_ARTICLES.filter((article) => article.chapter === chapter.slice(0, 2)) : DEMO_ARTICLES
  const rowId = (article: DemoArticle) => `${article.chapter}.${article.code}.${article.sub}`

  return (
    <Workspace
      demo
      entries={rows.length}
      tabLabel="Catalogue libre"
      toolbar={
        <>
          <StandardTools />
          <ToolMenu icon="import" label="Import" />
          <ToolMenu icon="export" label="Export" />
          <ToolSep />
          <ToolButton icon="chevron" title="Article précédent" tone="primary" />
          <ToolButton icon="chevron" title="Article suivant" tone="primary" />
          <BbSelect className="ml-1 w-44" defaultValue="descriptif">
            <option value="descriptif">Article descriptif</option>
            <option value="libre">Texte libre</option>
          </BbSelect>
          <ToolSep />
          <BbSelect className="w-56" defaultValue="1">
            <option value="1">1 - Devis - prix H., M1, M2, M3</option>
            <option value="2">2 - Régie</option>
          </BbSelect>
          <ToolSep />
          <ToolButton icon="fileplus" title="Nouvel article (création à la volée)" tone="success" />
          <ToolButton icon="table" title="Positions" tone="primary" />
        </>
      }
      aside={
        <AsidePanel
          nav={[
            { icon: 'tree', label: 'Structure arborescente', active: true },
            { icon: 'image', label: 'Graphique' },
          ]}
        >
          <div className="mt-1 text-[15px] text-gray-800">Structure arborescente</div>
          <div className="mt-2 border border-bb-line bg-white py-1">
            <Tree nodes={TREE} selectedId={chapter} onSelect={(node) => setChapter(node.id)} defaultExpanded={['18']} />
          </div>
          <BbCheckbox
            label="Synchroniser"
            checked={sync}
            onChange={(event) => setSync(event.target.checked)}
            className="mt-2"
          />
        </AsidePanel>
      }
    >
      <DataGrid
        className="h-full"
        columns={COLUMNS}
        rows={rows}
        rowKey={rowId}
        rowClass={(row) => (row.isTitle ? 'bg-white font-medium' : 'bg-bb-row')}
        selectedKey={selectedId}
        onSelect={(row) => setSelectedId(rowId(row))}
      />
    </Workspace>
  )
}
