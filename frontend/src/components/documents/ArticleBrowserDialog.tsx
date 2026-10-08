import { useMemo, useState } from 'react'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import Tree from '@/components/baubit/Tree'
import { Icon } from '@/components/icons'
import Modal from '@/components/ui/Modal'
import { useCatalogChapters, useChapterTree } from '@/hooks/useCatalog'
import { useArticlePicker } from '@/hooks/useDocuments'
import type { PickerArticle } from '@/hooks/useDocuments'
import { searchIndex } from '@/lib/searchIndex'

interface ArticleBrowserDialogProps {
  open: boolean
  onClose: () => void
  /** Insère l'article ; la fenêtre reste ouverte si keepOpen. */
  onPick: (article: PickerArticle, keepOpen: boolean) => void
  /** Chapitre de l'étape : sélectionné à l'ouverture. */
  chapterId?: number | null
}

const COLUMNS: GridColumn<PickerArticle>[] = [
  { key: 'code', header: 'Code', value: (a) => a.code, width: 90 },
  { key: 'description', header: 'Description', value: (a) => a.description, wrap: true, width: 440 },
  { key: 'unit', header: 'Un.', value: (a) => a.unit, width: 60 },
  { key: 'sale', header: 'Prix', value: (a) => a.sale, type: 'number', width: 90 },
]

/**
 * Fenêtre de recherche d'un article du catalogue : chapitres à gauche, recherche et liste à droite.
 * Complète le champ d'ajout rapide quand on ne connaît ni le code ni les premiers mots de l'article.
 * Double-clic ou Entrée insère ; « Insérer et continuer » enchaîne plusieurs positions.
 */
export default function ArticleBrowserDialog(props: ArticleBrowserDialogProps) {
  return props.open ? <ArticleBrowser {...props} /> : null
}

function ArticleBrowser({ onClose, onPick, chapterId = null }: ArticleBrowserDialogProps) {
  const chapters = useCatalogChapters()
  const tree = useChapterTree(chapters.data)
  const picker = useArticlePicker()
  const [chapter, setChapter] = useState<number | null>(chapterId)
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const chapterIds = useMemo(() => {
    if (chapter === null) return null
    const list = chapters.data ?? []
    return new Set([chapter, ...list.filter((item) => item.parent_id === chapter).map((item) => item.id)])
  }, [chapter, chapters.data])

  const rows = useMemo<PickerArticle[]>(() => {
    if (!picker.data) return []
    const inChapter = (article: PickerArticle) => chapterIds === null || chapterIds.has(article.chapterId)
    const text = term.trim()
    if (text.length >= 2) {
      return (searchIndex(picker.data.index, text, 300)[0]?.items ?? [])
        .map((item) => picker.data?.articles.get(item.id))
        .filter((article): article is PickerArticle => Boolean(article) && inChapter(article as PickerArticle))
    }
    return [...picker.data.articles.values()].filter(inChapter).sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }))
  }, [picker.data, chapterIds, term])

  const current = rows.find((row) => row.id === selected) ?? rows[0] ?? null

  function pick(keepOpen: boolean) {
    if (!current) return
    onPick(current, keepOpen)
    if (!keepOpen) {
      onClose()
    }
  }

  const chapterLabel = chapter === null ? 'Tous les chapitres' : (tree.flatMap((node) => [node, ...(node.children ?? [])]).find((node) => node.id === String(chapter))?.label ?? '')

  return (
    <Modal open onClose={onClose} size="xl">
      <div className="bb flex h-[70vh] min-h-[420px] flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Rechercher un article du catalogue</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Fermer">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex w-[280px] shrink-0 flex-col overflow-auto rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setChapter(null)}
              className={`px-3 py-2 text-left text-[13px] ${chapter === null ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Tous les chapitres
            </button>
            <Tree nodes={tree} selectedId={chapter === null ? null : String(chapter)} onSelect={(node) => setChapter(Number(node.id))} defaultExpanded={tree.map((node) => node.id)} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="relative mb-2">
              <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value)
                  setSelected(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    pick(false)
                  } else if (event.key === 'Escape') {
                    onClose()
                  }
                }}
                placeholder={`Rechercher dans ${chapterLabel.toLowerCase()} : mots de la description ou code…`}
                className="h-9 w-full rounded-md border border-gray-300 pl-9 pr-3 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <DataGrid
              className="min-h-0 flex-1 rounded-lg border border-gray-200"
              columns={COLUMNS}
              rows={rows}
              rowKey={(row) => String(row.id)}
              selectedKey={current ? String(current.id) : null}
              onSelect={(row) => setSelected(row.id)}
              onActivate={(row) => {
                setSelected(row.id)
                onPick(row, false)
                onClose()
              }}
              showFilter={false}
              emptyText={picker.isLoading ? 'Chargement du catalogue…' : 'Aucun article.'}
            />
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[12px] text-gray-400">
                {rows.length} article{rows.length > 1 ? 's' : ''} · double-clic ou Entrée pour insérer
              </span>
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => pick(true)} disabled={!current} className="h-8 rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                  Insérer et continuer
                </button>
                <button type="button" onClick={() => pick(false)} disabled={!current} className="h-8 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40">
                  Insérer
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
