import { useState } from 'react'
import { Icon } from '@/components/icons'

export interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
}

interface TreeProps {
  nodes: TreeNode[]
  selectedId?: string | null
  onSelect?: (node: TreeNode) => void
  /** Identifiants dépliés au départ. */
  defaultExpanded?: string[]
}

/** Arborescence (structure des étapes, catalogue) avec dossiers dépliables. */
export default function Tree({ nodes, selectedId, onSelect, defaultExpanded = [] }: TreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(defaultExpanded))

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function renderNodes(items: TreeNode[], depth: number) {
    return items.map((node) => {
      const hasChildren = Boolean(node.children?.length)
      const open = expanded.has(node.id)
      const selected = node.id === selectedId
      return (
        <div key={node.id}>
          <div
            className={`flex h-7 cursor-default items-center gap-1 whitespace-nowrap rounded-md pr-2 text-[13px] transition ${
              selected ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={{ paddingLeft: 4 + depth * 16 }}
            onClick={() => onSelect?.(node)}
            onDoubleClick={() => hasChildren && toggle(node.id)}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                toggle(node.id)
              }}
              className={`flex h-4 w-4 items-center justify-center text-gray-400 ${hasChildren ? '' : 'invisible'}`}
              aria-label={open ? 'Replier' : 'Déplier'}
            >
              <Icon name="chevron" className={`h-3 w-3 transition ${open ? 'rotate-90' : ''}`} />
            </button>
            <Icon name="folder" className={`h-4 w-4 ${selected ? 'text-primary-500' : 'text-amber-400'}`} />
            <span className="ml-1 truncate">{node.label}</span>
          </div>
          {hasChildren && open && renderNodes(node.children!, depth + 1)}
        </div>
      )
    })
  }

  return <div className="select-none">{renderNodes(nodes, 0)}</div>
}
