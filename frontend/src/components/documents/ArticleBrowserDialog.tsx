import { useMemo, useState } from 'react'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import Tree from '@/components/baubit/Tree'
import { Icon } from '@/components/icons'
import Modal from '@/components/ui/Modal'
import UnitSelect from '@/components/shared/UnitSelect'
import { BB_FIELD } from '@/components/baubit/Form'
import { useCatalogChapters, useChapterTree } from '@/hooks/useCatalog'
import { useArticlePicker, useCreateArticleOnTheFly } from '@/hooks/useDocuments'
import type { PickerArticle } from '@/hooks/useDocuments'
import { PRICE_PATTERN, nullable, toNumber } from '@/lib/crud'
import { searchIndex } from '@/lib/searchIndex'
import { toast } from '@/lib/toast'
import type { CatalogChapter } from '@/types'

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
  const [creating, setCreating] = useState(false)

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
            {creating && (
              <NewArticleForm
                chapters={chapters.data ?? []}
                chapterId={chapter}
                description={term.trim()}
                onCancel={() => setCreating(false)}
                onCreated={(article) => {
                  onPick(article, false)
                  onClose()
                }}
              />
            )}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[12px] text-gray-400">
                {rows.length} article{rows.length > 1 ? 's' : ''} · double-clic ou Entrée pour insérer
              </span>
              <span className="ml-auto flex gap-2">
                {!creating && (
                  <button type="button" onClick={() => setCreating(true)} className="flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 hover:bg-gray-50">
                    <Icon name="plus" className="h-3.5 w-3.5" />
                    Nouvel article
                  </button>
                )}
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

interface NewArticleFormProps {
  chapters: CatalogChapter[]
  /** Chapitre sélectionné dans la fenêtre (proposé par défaut). */
  chapterId: number | null
  /** Texte de la recherche, repris comme description. */
  description: string
  onCancel: () => void
  onCreated: (article: PickerArticle) => void
}

/** Création d'un article dans le catalogue depuis la fenêtre, puis insertion immédiate dans l'étape. */
function NewArticleForm({ chapters, chapterId, description: initial, onCancel, onCreated }: NewArticleFormProps) {
  const create = useCreateArticleOnTheFly()
  const [chapter, setChapter] = useState(chapterId ? String(chapterId) : '')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState(initial)
  const [unit, setUnit] = useState('')
  const [purchase, setPurchase] = useState('')
  const [sale, setSale] = useState('')

  const valid = chapter !== '' && description.trim() !== '' && PRICE_PATTERN.test(purchase) && PRICE_PATTERN.test(sale)

  async function submit() {
    if (!valid || create.isPending) return
    try {
      const article = await create.mutateAsync({
        catalog_chapter_id: Number(chapter),
        code: nullable(code),
        description: description.trim(),
        unit: nullable(unit),
        purchase_price: toNumber(purchase),
        sale_price: toNumber(sale),
      })
      const chapterCode = chapters.find((item) => item.id === article.catalog_chapter_id)?.code
      toast('Article ajouté au catalogue et inséré.', 'success')
      onCreated({
        id: article.id,
        code: [chapterCode, article.code, article.sub_code].filter(Boolean).join('.'),
        description: article.description,
        unit: article.unit,
        sale: article.sale_price,
        purchase: article.purchase_price,
        chapterId: article.catalog_chapter_id,
      })
    } catch {
      toast("L'article n'a pas pu être créé.", 'error')
    }
  }

  const sorted = [...chapters].sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }))

  return (
    <form
      className="mt-3 rounded-lg border border-primary-200 bg-primary-50/50 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="mb-2 text-[13px] font-semibold text-gray-800">Nouvel article du catalogue</div>
      <div className="grid grid-cols-[1fr_90px] gap-2">
        <select value={chapter} onChange={(e) => setChapter(e.target.value)} className={`${BB_FIELD} w-full`} aria-label="Chapitre">
          <option value="">— chapitre —</option>
          {sorted.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} - {item.label}
            </option>
          ))}
        </select>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" maxLength={20} className={`${BB_FIELD} w-full`} aria-label="Code" />
        <textarea
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Description (obligatoire)"
          className={`${BB_FIELD} col-span-2 h-auto w-full py-1.5`}
          aria-label="Description"
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <UnitSelect value={unit} onChange={(e) => setUnit(e.target.value)} className={`${BB_FIELD} w-28`} aria-label="Unité" />
        <input value={purchase} onChange={(e) => setPurchase(e.target.value)} placeholder="Prix d'achat" inputMode="decimal" className={`${BB_FIELD} w-28 text-right ${PRICE_PATTERN.test(purchase) ? '' : 'border-red-400'}`} aria-label="Prix d'achat" />
        <input value={sale} onChange={(e) => setSale(e.target.value)} placeholder="Prix de vente" inputMode="decimal" className={`${BB_FIELD} w-28 text-right ${PRICE_PATTERN.test(sale) ? '' : 'border-red-400'}`} aria-label="Prix de vente" />
        <span className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          <button type="submit" disabled={!valid || create.isPending} className="h-8 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40">
            Créer et insérer
          </button>
        </span>
      </div>
    </form>
  )
}
