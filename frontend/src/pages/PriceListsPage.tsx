import { useState } from 'react'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolButton, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import TabStrip from '@/components/baubit/TabStrip'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import Tree from '@/components/baubit/Tree'
import { BbSelect } from '@/components/baubit/Form'
import { DEMO_PRICE_ELEMENTS, PRICE_FAMILIES } from '@/lib/demo'
import type { DemoPriceElement } from '@/lib/demo'

const ALL = '1…6 - Tous'
const TABS = [...PRICE_FAMILIES.map((family) => family.label), ALL]

const COLUMNS: GridColumn<DemoPriceElement>[] = [
  { key: 'group', header: 'Grp.', value: (e) => e.group, width: 50 },
  { key: 'number', header: 'N° élément', value: (e) => e.number, width: 90 },
  { key: 'description', header: 'Description', value: (e) => e.description, width: 460 },
  { key: 'unit', header: 'Un.', value: (e) => e.unit, width: 55 },
  { key: 'unitRegie', header: 'Un. régie', value: (e) => e.unitRegie, width: 70 },
  { key: 'supplierPrice', header: 'Prix fourn.', value: (e) => e.supplierPrice, type: 'number', width: 80 },
  { key: 'net', header: 'Net', value: (e) => e.net, type: 'number', width: 80 },
  { key: 'regieRate', header: 'Tarif régie', value: (e) => e.regieRate, width: 90 },
  { key: 'unitCom', header: 'Un. com.', value: (e) => e.unitCom, type: 'number', decimals: 4, width: 70 },
  { key: 'mutation', header: 'Mutation de…', value: (e) => e.mutation, width: 90 },
  { key: 'rabChf', header: 'Rab. CHF', value: () => null, type: 'number', width: 70 },
  { key: 'rabPct', header: 'Rab. %', value: () => null, type: 'number', width: 60 },
]

/** Éléments de coûts : onglets par famille (salaire, matériaux, machines…), grille des prix. */
export default function PriceListsPage() {
  const [tab, setTab] = useState(PRICE_FAMILIES[1].label)
  const [group, setGroup] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const family = PRICE_FAMILIES.find((item) => item.label === tab)
  const byFamily = family ? DEMO_PRICE_ELEMENTS.filter((item) => item.family === family.id) : DEMO_PRICE_ELEMENTS
  const rows = group ? byFamily.filter((item) => item.group === group) : byFamily
  const groups = Array.from(new Set(byFamily.map((item) => item.group))).sort()

  return (
    <Workspace
      demo
      entries={rows.length}
      tabLabel="Eléments de coûts"
      toolbar={
        <>
          <StandardTools newLabel="Nouvel élément" />
          <ToolMenu icon="export" label="Export" />
          <ToolSep />
          <ToolButton icon="refresh" title="Mettre à jour les prix" tone="primary" />
          <ToolButton icon="paperclip" title="Documents fournisseur" />
          <ToolButton icon="import" title="Importer une liste de prix" tone="primary" />
          <ToolSep />
          <ToolMenu label="Extras" />
          <ToolSep />
          <BbSelect className="w-64" defaultValue="interne">
            <option value="interne">Liste de prix interne</option>
            <option value="sse">SSE - Société suisse des entrepreneurs</option>
          </BbSelect>
        </>
      }
      aside={
        <AsidePanel nav={[{ icon: 'tree', label: 'Structure arborescente', active: true }]}>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Groupes</div>
          <div className="mt-2 py-1">
            <Tree
              nodes={groups.map((code) => ({ id: code, label: `${code} - Groupe ${code}` }))}
              selectedId={group}
              onSelect={(node) => setGroup(group === node.id ? null : node.id)}
            />
          </div>
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <TabStrip
          tabs={TABS}
          active={tab}
          onChange={(value) => {
            setTab(value)
            setGroup(null)
          }}
          className="shrink-0 px-4"
        />
        <DataGrid
          className="min-h-0 flex-1"
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => `${row.family}-${row.number}`}
          selectedKey={selectedId}
          onSelect={(row) => setSelectedId(`${row.family}-${row.number}`)}
        />
      </div>
    </Workspace>
  )
}
