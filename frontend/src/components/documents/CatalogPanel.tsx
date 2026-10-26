import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/icons'
import { BB_FIELD } from '@/components/baubit/Form'
import UnitSelect from '@/components/shared/UnitSelect'
import ArticleCreateDialog from '@/components/documents/ArticleCreateDialog'
import Modal from '@/components/ui/Modal'
import { useCatalogChapters } from '@/hooks/useCatalog'
import { useArticlePicker } from '@/hooks/useDocuments'
import type { PickerArticle } from '@/hooks/useDocuments'
import { endCatalogDrag, startCatalogDrag } from '@/lib/catalogDrag'
import type { CatalogItem } from '@/lib/catalogDrag'
import { PRICE_PATTERN, nullable, toNumber, useResourceItem, useSaveResource } from '@/lib/crud'
import { fmtAmount } from '@/lib/format'
import { findStepForArticle, findStepForChapter } from '@/lib/quoteInsert'
import { searchIndex } from '@/lib/searchIndex'
import { toast } from '@/lib/toast'
import type { CatalogArticle, CatalogChapter, DocumentDetail } from '@/types'

/** Clé d'un élément du catalogue dans la sélection : « a12 » (article) ou « c3 » (chapitre). */
const keyOf = (item: CatalogItem) => (item.kind === 'article' ? `a${item.article.id}` : `c${item.chapter.id}`)

interface CatalogPanelProps {
  /** Devis ouvert (marque ✓ les étapes présentes) ; sans devis, le catalogue se consulte seulement. */
  document: DocumentDetail | null
}

/**
 * Catalogue de prix dans le panneau du devis : chapitres (= modèles d'étapes) et leurs articles.
 * On ajoute au devis **uniquement en glissant** un article ou un chapitre vers la feuille (pas de
 * clic, pour éviter les ajouts involontaires) : sur une ligne pour choisir l'endroit, ailleurs pour
 * l'étape de son chapitre, créée au besoin (titre seul). Le crayon modifie l'article dans le catalogue.
 * Sélection multiple comme dans l'explorateur : clic sur un article, Ctrl + clic pour ajouter ou retirer
 * (articles et chapitres), Maj + clic pour une plage ; glisser un élément sélectionné emporte toute la sélection.
 */
export default function CatalogPanel({ document: doc }: CatalogPanelProps) {
  const chapters = useCatalogChapters()
  const picker = useArticlePicker()
  const [term, setTerm] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  // Chapitre dans lequel on crée un article (fenêtre ouverte par le + du chapitre).
  const [creatingIn, setCreatingIn] = useState<CatalogChapter | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [anchor, setAnchor] = useState<string | null>(null)
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

  // Ordre d'affichage des éléments (pour Maj + clic) et éléments par clé : remplis pendant le rendu.
  const order: string[] = []
  const byKey = new Map<string, CatalogItem>()
  function track(item: CatalogItem): string {
    const key = keyOf(item)
    order.push(key)
    byKey.set(key, item)
    return key
  }

  // Échap vide la sélection.
  useEffect(() => {
    if (selected.length === 0) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected([])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected.length])

  /**
   * Clic : Ctrl (ou Cmd) ajoute / retire, Maj sélectionne la plage depuis le dernier clic. Un clic simple
   * sélectionne l'article seul (`only`) ; sur un chapitre il déplie (`none` : renvoie false).
   */
  function select(event: React.MouseEvent, key: string, plain: 'only' | 'none'): boolean {
    if (event.shiftKey && anchor && order.includes(anchor)) {
      const [from, to] = [order.indexOf(anchor), order.indexOf(key)].sort((a, b) => a - b)
      const range = order.slice(from, to + 1)
      setSelected((current) => (event.ctrlKey || event.metaKey ? [...new Set([...current, ...range])] : range))
      return true
    }
    if (event.ctrlKey || event.metaKey) {
      setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
      setAnchor(key)
      return true
    }
    if (plain === 'only') {
      setSelected((current) => (current.length === 1 && current[0] === key ? [] : [key]))
      setAnchor(key)
      return true
    }
    return false
  }

  /** Glisser : un élément sélectionné emporte toute la sélection, dans l'ordre du catalogue. */
  function drag(event: React.DragEvent, item: CatalogItem, label: string) {
    event.dataTransfer.effectAllowed = 'copy'
    const many = selected.includes(keyOf(item)) && selected.length > 1
    if (!many) {
      event.dataTransfer.setData('text/plain', label)
      startCatalogDrag(item)
      return
    }
    const items = order.filter((entry) => selected.includes(entry)).flatMap((entry) => byKey.get(entry) ?? [])
    event.dataTransfer.setData('text/plain', `${items.length} éléments du catalogue`)
    // Image de glissement : une pastille « 3 éléments » au lieu de la seule ligne saisie.
    const badge = window.document.createElement('div')
    badge.textContent = `${items.length} éléments`
    badge.style.cssText = 'position:fixed;top:-100px;left:0;padding:4px 10px;border-radius:6px;background:#1d3f9c;color:#fff;font:600 12px system-ui,sans-serif'
    window.document.body.appendChild(badge)
    event.dataTransfer.setDragImage(badge, 12, 12)
    window.setTimeout(() => badge.remove(), 0)
    startCatalogDrag({ kind: 'many', items })
  }

  /** Fin du glissement : une sélection déposée sur le devis est vidée. */
  function dragEnd(event: React.DragEvent) {
    endCatalogDrag()
    if (event.dataTransfer.dropEffect !== 'none') {
      setSelected([])
    }
  }

  const inQuote = (article: PickerArticle) => (doc ? findStepForArticle(doc, list, article) : null)

  function renderArticle(article: PickerArticle, withChapter: boolean) {
    const step = inQuote(article)
    const item: CatalogItem = { kind: 'article', article }
    const key = track(item)
    const isSelected = selected.includes(key)
    return (
      <div
        key={article.id}
        draggable
        onDragStart={(event) => drag(event, item, article.description)}
        onDragEnd={dragEnd}
        onClick={(event) => select(event, key, 'only')}
        aria-selected={isSelected}
        title={`${article.description}\n\nGlisser sur le devis : sur une ligne pour choisir l’endroit, ailleurs ${step ? `dans l’étape « ${step.label} »` : 'dans son étape, qui sera créée'}.\nCtrl + clic ou Maj + clic : en sélectionner plusieurs, puis les glisser ensemble.`}
        className={`group flex cursor-grab items-center gap-1.5 rounded-md py-0.5 pl-1 pr-0.5 text-[12px] active:cursor-grabbing ${
          isSelected ? 'bg-primary-100 ring-1 ring-inset ring-primary-300' : 'hover:bg-primary-50'
        }`}
      >
        <span className="w-9 shrink-0 truncate text-[11px] text-gray-400">{article.code.split('.').slice(-2).join('.')}</span>
        <span className="min-w-0 flex-1 truncate text-gray-800">
          {article.description}
          {withChapter && <span className="text-gray-400"> · {chapterLabel(article.chapterId)}</span>}
        </span>
        <span className="shrink-0 tabular-nums text-gray-500">{article.sale !== null ? fmtAmount(article.sale) : ''}</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setEditingId(article.id)
          }}
          title="Modifier l'article dans le catalogue (fenêtre ; les lignes déjà dans le devis ne changent pas)"
          className="invisible flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-800 group-hover:visible"
        >
          <Icon name="edit" className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  function renderChapter(chapter: CatalogChapter, depth: number) {
    const children = list.filter((item) => item.parent_id === chapter.id)
    const articles = byChapter.get(chapter.id) ?? []
    const open = expanded.has(chapter.id)
    const step = doc ? findStepForChapter(doc, chapter.id) : null
    const item: CatalogItem = { kind: 'chapter', chapter }
    const key = track(item)
    const isSelected = selected.includes(key)
    return (
      <div key={chapter.id}>
        <div
          draggable
          onDragStart={(event) => drag(event, item, chapter.label)}
          onDragEnd={dragEnd}
          onClick={(event) => {
            if (!select(event, key, 'none')) {
              toggle(chapter.id)
            }
          }}
          aria-selected={isSelected}
          title={`${step ? 'Étape déjà dans le devis (clic : déplier les articles).' : 'Clic : déplier les articles. Glisser sur le devis : ajoute l’étape (titre seul).'}\nCtrl + clic : l’ajouter à la sélection.`}
          className={`group flex h-7 cursor-pointer items-center gap-1 rounded-md pr-0.5 text-[13px] text-gray-700 ${
            isSelected ? 'bg-primary-100 ring-1 ring-inset ring-primary-300' : 'hover:bg-gray-100'
          }`}
          style={{ paddingLeft: 2 + depth * 14 }}
        >
          <Icon name="chevron" className={`h-3 w-3 shrink-0 text-gray-400 transition ${open ? 'rotate-90' : ''}`} />
          <Icon name="folder" className={`h-4 w-4 shrink-0 ${step ? 'text-primary-500' : 'text-amber-400'}`} />
          <span className="w-7 shrink-0 text-[11px] text-gray-400">{chapter.code}</span>
          <span className={`min-w-0 flex-1 truncate ${step ? 'font-medium text-primary-700' : ''}`}>{chapter.label}</span>
          {step && <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-primary-500" />}
          {articles.length > 0 && <span className="shrink-0 text-[11px] text-gray-400">{articles.length}</span>}
          {doc && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setCreatingIn(chapter)
              }}
              draggable={false}
              title={`Ajouter un article dans « ${chapter.label} »`}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition hover:bg-primary-100 hover:text-primary-700 focus:opacity-100 group-hover:opacity-100"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
            </button>
          )}
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
          onChange={(event) => {
            setTerm(event.target.value)
            setSelected([])
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setTerm('')
            }
          }}
          placeholder="Chercher un article du catalogue…"
          className="h-8 w-full rounded-md border border-gray-300 pl-8 pr-2 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>
      {selected.length > 1 ? (
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2 rounded-md bg-primary-50 px-2 py-1 text-[12px] text-primary-800">
          <span>
            <b>{selected.length}</b> éléments sélectionnés : glissez-en un pour les ajouter ensemble.
          </span>
          <button type="button" onClick={() => setSelected([])} className="shrink-0 text-primary-600 hover:underline" title="Vider la sélection (Échap)">
            Annuler
          </button>
        </div>
      ) : (
        <p className="mb-2 shrink-0 text-[12px] text-gray-400">
          {doc ? 'Glissez un article ou un chapitre sur le devis pour l’ajouter. Ctrl ou Maj + clic : plusieurs à la fois.' : 'Ouvrez un devis pour y glisser des articles.'}
        </p>
      )}
      {editingId !== null && <ArticleQuickEdit key={editingId} id={editingId} chapters={list} onClose={() => setEditingId(null)} />}
      {creatingIn && (
        <ArticleCreateDialog
          key={creatingIn.id}
          chapter={creatingIn}
          onClose={() => setCreatingIn(null)}
          onCreated={() => setExpanded((current) => new Set(current).add(creatingIn.id))}
        />
      )}
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
 * Fenêtre de modification d'un article du catalogue, ouverte depuis le panneau du devis. Seul le catalogue
 * change : les positions déjà dans le devis sont des instantanés et gardent leur description et leur prix.
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
  const label = 'flex flex-col gap-1 text-[12px] font-medium text-gray-600'

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
    <Modal open onClose={onClose}>
      <form
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            onClose()
          }
        }}
        className="bb"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Catalogue de prix</div>
            <h3 className="text-[16px] font-semibold text-gray-900">Modifier l'article</h3>
            {chapter && (
              <div className="truncate text-[12px] text-gray-500">
                Chapitre {chapter.code} - {chapter.label}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} title="Fermer" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {!current ? (
          <p className="mt-6 text-[13px] text-gray-400">{article.isError ? 'Article introuvable.' : 'Chargement…'}</p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className={label}>
              Description
              <textarea
                autoFocus
                value={current.description}
                onChange={(e) => setDraft({ ...current, description: e.target.value })}
                rows={4}
                className={`${BB_FIELD} h-auto w-full py-1.5 text-[13px] font-normal`}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                Code
                <input value={current.code} onChange={(e) => setDraft({ ...current, code: e.target.value })} maxLength={20} className={`${BB_FIELD} w-full font-normal`} />
              </label>
              <label className={label}>
                Unité
                <UnitSelect value={current.unit} onChange={(unit) => setDraft({ ...current, unit })} className={`${BB_FIELD} w-full font-normal`} />
              </label>
              <label className={label}>
                Prix d'achat
                <input
                  value={current.purchase}
                  onChange={(e) => setDraft({ ...current, purchase: e.target.value })}
                  inputMode="decimal"
                  className={`${BB_FIELD} w-full text-right font-normal ${PRICE_PATTERN.test(current.purchase) ? '' : 'border-red-400'}`}
                />
              </label>
              <label className={label}>
                Prix de vente
                <input
                  value={current.sale}
                  onChange={(e) => setDraft({ ...current, sale: e.target.value })}
                  inputMode="decimal"
                  className={`${BB_FIELD} w-full text-right font-normal ${PRICE_PATTERN.test(current.sale) ? '' : 'border-red-400'}`}
                />
              </label>
            </div>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
              Seul le catalogue est modifié : les lignes déjà insérées dans les devis gardent leur description et leur prix.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          <button type="submit" disabled={!valid || save.isPending} className="h-8 rounded-md bg-accent-600 px-4 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40">
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  )
}
