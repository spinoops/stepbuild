import { useMemo, useState } from 'react'
import { Icon } from '@/components/icons'
import { BB_FIELD } from '@/components/baubit/Form'
import UnitSelect from '@/components/shared/UnitSelect'
import { useCatalogChapters } from '@/hooks/useCatalog'
import { useArticlePicker } from '@/hooks/useDocuments'
import type { DocumentActions, PickerArticle } from '@/hooks/useDocuments'
import { endCatalogDrag, startCatalogDrag } from '@/lib/catalogDrag'
import { PRICE_PATTERN, nullable, toNumber, useResourceItem, useSaveResource } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { ensureStep, findStepForArticle, findStepForChapter, focusInsertedPosition, insertArticle } from '@/lib/quoteInsert'
import { searchIndex } from '@/lib/searchIndex'
import { toast } from '@/lib/toast'
import type { CatalogArticle, CatalogChapter, DocumentDetail } from '@/types'

interface CatalogPanelProps {
  /** Devis ouvert ; sans devis, le catalogue se consulte seulement. */
  document: DocumentDetail | null
  actions: DocumentActions | null
}

/**
 * Catalogue de prix dans le panneau du devis : chapitres (= modèles d'étapes) et leurs articles.
 * Un article s'ajoute au devis d'un double-clic ou du bouton « + » : dans l'étape de son chapitre,
 * créée au besoin (titre seul). Chapitres et articles se glissent aussi vers la feuille.
 */
export default function CatalogPanel({ document: doc, actions }: CatalogPanelProps) {
  const chapters = useCatalogChapters()
  const picker = useArticlePicker()
  const [term, setTerm] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const text = term.trim()
  const list = useMemo(() => chapters.data ?? [], [chapters.data])

  const byChapter = useMemo(() => {
    const map = new Map<number, PickerArticle[]>()
    for (const article of picker.data?.articles.values() ?? []) {
      const bucket = map.get(article.chapterId)
      if (bucket) {
        bucket.push(article)
      } else {
        map.set(article.chapterId, [article])
      }
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }))
    }
    return map
  }, [picker.data])

  const found = useMemo<PickerArticle[]>(() => {
    if (text.length < 2 || !picker.data) {
      return []
    }
    return (searchIndex(picker.data.index, text, 60)[0]?.items ?? []).flatMap((item) => {
      const article = picker.data?.articles.get(item.id)
      return article ? [article] : []
    })
  }, [picker.data, text])

  const chapterLabel = (id: number) => {
    const chapter = list.find((item) => item.id === id)
    return chapter ? `${chapter.code} - ${chapter.label}` : ''
  }

  function toggle(id: number) {
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

  async function run(task: () => Promise<void>) {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      await task()
    } catch {
      toast("L'ajout au devis a échoué.", 'error')
    } finally {
      setBusy(false)
    }
  }

  function addArticle(article: PickerArticle) {
    if (!doc || !actions) {
      toast("Ouvrez d'abord un devis pour y ajouter des articles.", 'info')
      return
    }
    void run(async () => {
      const result = await insertArticle(doc, actions, list, article)
      toast(result.stepCreated ? `Étape « ${result.step.label} » ajoutée au devis, puis l'article.` : `Ajouté dans l'étape « ${result.step.label} ».`, 'success')
      focusInsertedPosition(result.step.id, result.positionId)
    })
  }

  function addChapter(chapter: CatalogChapter) {
    if (!doc || !actions) {
      toast("Ouvrez d'abord un devis pour y ajouter des étapes.", 'info')
      return
    }
    void run(async () => {
      const { step, created } = await ensureStep(doc, actions, chapter.id)
      toast(created ? `Étape « ${step.label} » ajoutée au devis (titre seul).` : `L'étape « ${step.label} » est déjà dans le devis.`, created ? 'success' : 'info')
      focusInsertedPosition(step.id, null)
    })
  }

  function dragArticle(event: React.DragEvent, article: PickerArticle) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('text/plain', article.description)
    startCatalogDrag({ kind: 'article', article })
  }

  function dragChapter(event: React.DragEvent, chapter: CatalogChapter) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('text/plain', chapter.label)
    startCatalogDrag({ kind: 'chapter', chapter })
  }

  const inQuote = (article: PickerArticle) => (doc ? findStepForArticle(doc, list, article) : null)

  function renderArticle(article: PickerArticle, withChapter: boolean) {
    const step = inQuote(article)
    return (
      <div
        key={article.id}
        draggable
        onDragStart={(event) => dragArticle(event, article)}
        onDragEnd={endCatalogDrag}
        onDoubleClick={() => addArticle(article)}
        title={`${article.description}\n\nDouble-clic ou « + » : ajouter au devis${step ? ` (étape « ${step.label} »)` : ' (l’étape sera créée)'}. Glisser vers la feuille pour choisir l’endroit.`}
        className="group flex cursor-grab items-center gap-1.5 rounded-md py-0.5 pl-1 pr-0.5 text-[12px] hover:bg-primary-50 active:cursor-grabbing"
      >
        <span className="w-9 shrink-0 truncate text-[11px] text-gray-400">{article.code.split('.').slice(-2).join('.')}</span>
        <span className="min-w-0 flex-1 truncate text-gray-800">
          {article.description}
          {withChapter && <span className="text-gray-400"> · {chapterLabel(article.chapterId)}</span>}
        </span>
        <span className="shrink-0 tabular-nums text-gray-500">{article.sale !== null ? fmtAmount(article.sale) : ''}</span>
        <button
          type="button"
          onClick={() => setEditingId(article.id)}
          title="Modifier l'article dans le catalogue (les lignes déjà dans le devis ne changent pas)"
          className="invisible flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-800 group-hover:visible"
        >
          <Icon name="edit" className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => addArticle(article)}
          title="Ajouter au devis"
          className="invisible flex h-5 w-5 shrink-0 items-center justify-center rounded text-primary-700 hover:bg-primary-100 group-hover:visible disabled:opacity-40"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  function renderChapter(chapter: CatalogChapter, depth: number) {
    const children = list.filter((item) => item.parent_id === chapter.id)
    const articles = byChapter.get(chapter.id) ?? []
    const open = expanded.has(chapter.id)
    const step = doc ? findStepForChapter(doc, chapter.id) : null
    return (
      <div key={chapter.id}>
        <div
          draggable
          onDragStart={(event) => dragChapter(event, chapter)}
          onDragEnd={endCatalogDrag}
          onClick={() => toggle(chapter.id)}
          onDoubleClick={() => addChapter(chapter)}
          title={step ? `Étape déjà dans le devis. Glisser ou « + » : aller à l’étape.` : 'Double-clic ou « + » : ajouter l’étape au devis (titre seul). Glisser vers la feuille.'}
          className="group flex h-7 cursor-pointer items-center gap-1 rounded-md pr-0.5 text-[13px] text-gray-700 hover:bg-gray-100"
          style={{ paddingLeft: 2 + depth * 14 }}
        >
          <Icon name="chevron" className={`h-3 w-3 shrink-0 text-gray-400 transition ${open ? 'rotate-90' : ''}`} />
          <Icon name="folder" className={`h-4 w-4 shrink-0 ${step ? 'text-primary-500' : 'text-amber-400'}`} />
          <span className="w-7 shrink-0 text-[11px] text-gray-400">{chapter.code}</span>
          <span className={`min-w-0 flex-1 truncate ${step ? 'font-medium text-primary-700' : ''}`}>{chapter.label}</span>
          {step && <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-primary-500" />}
          {articles.length > 0 && <span className="shrink-0 text-[11px] text-gray-400">{articles.length}</span>}
          <button
            type="button"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation()
              addChapter(chapter)
            }}
            title={step ? "Aller à l'étape" : "Ajouter l'étape au devis"}
            className="invisible flex h-5 w-5 shrink-0 items-center justify-center rounded text-primary-700 hover:bg-primary-100 group-hover:visible disabled:opacity-40"
          >
            <Icon name={step ? 'arrow' : 'plus'} className="h-3.5 w-3.5" />
          </button>
        </div>
        {open && (
          <div style={{ marginLeft: 10 + depth * 14 }} className="border-l border-gray-100 pl-1">
            {children.map((child) => renderChapter(child, 0))}
            {articles.map((article) => renderArticle(article, false))}
            {children.length === 0 && articles.length === 0 && <div className="py-1 pl-2 text-[12px] text-gray-400">Aucun article.</div>}
          </div>
        )}
      </div>
    )
  }

  const roots = list.filter((chapter) => chapter.parent_id === null)

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-2 mt-1 shrink-0">
        <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setTerm('')
            } else if (event.key === 'Enter' && found[0]) {
              event.preventDefault()
              addArticle(found[0])
            }
          }}
          placeholder="Chercher un article du catalogue…"
          className="h-8 w-full rounded-md border border-gray-300 pl-8 pr-2 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>
      {!doc && <p className="mb-2 shrink-0 text-[12px] text-gray-400">Ouvrez un devis pour y ajouter des articles.</p>}
      {editingId !== null && <ArticleQuickEdit key={editingId} id={editingId} chapters={list} onClose={() => setEditingId(null)} />}
      <div className="min-h-0 flex-1 select-none">
        {text.length >= 2 ? (
          <>
            {found.map((article) => renderArticle(article, true))}
            {found.length === 0 && <p className="px-1 text-[12px] text-gray-400">{picker.isLoading ? 'Chargement du catalogue…' : 'Aucun article trouvé.'}</p>}
          </>
        ) : (
          <>
            {roots.map((chapter) => renderChapter(chapter, 0))}
            {roots.length === 0 && <p className="px-1 text-[12px] text-gray-400">{chapters.isLoading ? 'Chargement…' : 'Catalogue vide.'}</p>}
          </>
        )}
      </div>
    </div>
  )
}

interface ArticleQuickEditProps {
  id: number
  chapters: CatalogChapter[]
  onClose: () => void
}

/**
 * Modification rapide d'un article du catalogue depuis le panneau du devis. Seul le catalogue change :
 * les positions déjà dans le devis sont des instantanés et gardent leur description et leur prix.
 */
function ArticleQuickEdit({ id, chapters, onClose }: ArticleQuickEditProps) {
  const article = useResourceItem<CatalogArticle>('catalog-articles', id)
  const save = useSaveResource<CatalogArticle, Record<string, unknown>>('catalog-articles')
  const [draft, setDraft] = useState<{ description: string; code: string; unit: string; purchase: string; sale: string } | null>(null)
  const data = article.data
  const current = draft ?? (data
    ? { description: data.description, code: data.code ?? '', unit: data.unit ?? '', purchase: data.purchase_price !== null ? String(data.purchase_price) : '', sale: data.sale_price !== null ? String(data.sale_price) : '' }
    : null)
  const valid = current !== null && current.description.trim() !== '' && PRICE_PATTERN.test(current.purchase) && PRICE_PATTERN.test(current.sale)
  const chapter = data ? chapters.find((item) => item.id === data.catalog_chapter_id) : null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!data || !current || !valid || save.isPending) {
      return
    }
    save.mutate(
      {
        id: data.id,
        payload: {
          catalog_chapter_id: data.catalog_chapter_id,
          code: nullable(current.code),
          sub_code: data.sub_code,
          description: current.description.trim(),
          unit: nullable(current.unit),
          purchase_price: toNumber(current.purchase),
          sale_price: toNumber(current.sale),
        },
      },
      {
        onSuccess: () => {
          toast('Article modifié dans le catalogue. Les lignes déjà dans le devis ne changent pas.', 'success')
          onClose()
        },
        onError: () => toast("L'article n'a pas pu être modifié.", 'error'),
      },
    )
  }

  return (
    <form onSubmit={submit} onKeyDown={(event) => event.key === 'Escape' && onClose()} className="mb-2 shrink-0 rounded-lg border border-primary-200 bg-primary-50/60 p-2 text-[12px]">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-semibold text-gray-800">Modifier l'article {chapter ? `· ${chapter.code} ${chapter.label}` : ''}</span>
        <button type="button" onClick={onClose} title="Fermer" className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-gray-700">
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>
      </div>
      {!current ? (
        <p className="text-gray-400">{article.isError ? 'Article introuvable.' : 'Chargement…'}</p>
      ) : (
        <>
          <textarea
            autoFocus
            value={current.description}
            onChange={(e) => setDraft({ ...current, description: e.target.value })}
            rows={2}
            className={`${BB_FIELD} h-auto w-full py-1 text-[12px]`}
            aria-label="Description"
          />
          <div className="mt-1.5 grid grid-cols-[56px_1fr_1fr_1fr] gap-1">
            <input value={current.code} onChange={(e) => setDraft({ ...current, code: e.target.value })} placeholder="Code" maxLength={20} className={`${BB_FIELD} w-full px-1.5 text-[12px]`} aria-label="Code" />
            <UnitSelect value={current.unit} onChange={(e) => setDraft({ ...current, unit: e.target.value })} className={`${BB_FIELD} w-full px-1 text-[12px]`} aria-label="Unité" />
            <input value={current.purchase} onChange={(e) => setDraft({ ...current, purchase: e.target.value })} placeholder="Achat" inputMode="decimal" title="Prix d'achat" className={`${BB_FIELD} w-full px-1.5 text-right text-[12px] ${PRICE_PATTERN.test(current.purchase) ? '' : 'border-red-400'}`} aria-label="Prix d'achat" />
            <input value={current.sale} onChange={(e) => setDraft({ ...current, sale: e.target.value })} placeholder="Vente" inputMode="decimal" title="Prix de vente" className={`${BB_FIELD} w-full px-1.5 text-right text-[12px] ${PRICE_PATTERN.test(current.sale) ? '' : 'border-red-400'}`} aria-label="Prix de vente" />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">Les lignes déjà dans le devis ne changent pas.</span>
            <button type="submit" disabled={!valid || save.isPending} className="h-7 rounded-md bg-accent-600 px-2.5 text-[12px] font-medium text-white hover:bg-accent-700 disabled:opacity-40">
              Enregistrer
            </button>
          </div>
        </>
      )}
    </form>
  )
}
