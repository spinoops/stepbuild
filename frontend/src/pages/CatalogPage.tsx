import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { StandardTools, ToolMenu, ToolSep } from '@/components/baubit/Toolbar'
import DataGrid from '@/components/baubit/DataGrid'
import type { GridColumn } from '@/components/baubit/DataGrid'
import GridPager from '@/components/baubit/GridPager'
import Tree from '@/components/baubit/Tree'
import type { TreeNode } from '@/components/baubit/Tree'
import { BbCheckbox, BbInput, BbSelect, BbTextarea, Field, SectionTitle } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import { useDebounced } from '@/hooks/useDebounced'
import { SAVE_LABELS, useEntityForm } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import { useSelection } from '@/hooks/useSelection'
import { api } from '@/lib/api'
import {
  EMPTY_QUERY,
  PRICE_PATTERN,
  nullable,
  toNumber,
  useDeleteResource,
  useResourceItem,
  useResourceList,
  useSaveResource,
} from '@/lib/crud'
import type { GridQuery } from '@/lib/crud'
import { toast } from '@/lib/toast'
import type { CatalogArticle, CatalogChapter } from '@/types'

const FORM_ID = 'catalog-article-form'

const COLUMNS: GridColumn<CatalogArticle>[] = [
  { key: 'chapter', header: 'Chap.', value: (a) => a.chapter_code ?? '', width: 70, noFilter: true },
  { key: 'code', header: 'Code', value: (a) => a.code, width: 80 },
  { key: 'sub_code', header: 'Sous-code', value: (a) => a.sub_code, width: 90 },
  { key: 'description', header: 'Description', value: (a) => a.description, width: 520, wrap: true },
  { key: 'unit', header: 'Un.', value: (a) => a.unit, width: 70 },
  { key: 'purchase_price', header: 'Achat', value: (a) => a.purchase_price, type: 'number', width: 100 },
  { key: 'sale_price', header: 'Vente', value: (a) => a.sale_price, type: 'number', width: 100 },
  { key: 'work_type', header: 'Type de travail', value: (a) => a.work_type, width: 120 },
  { key: 'category', header: 'Catégorie', value: (a) => a.category, width: 120 },
]

const price = z.string().regex(PRICE_PATTERN, 'Prix invalide.')

const schema = z.object({
  catalog_chapter_id: z.string().min(1, 'Choisissez un chapitre.'),
  code: z.string().max(20),
  sub_code: z.string().max(20),
  description: z.string().trim().min(1, 'La description est requise.').max(5000),
  unit: z.string().max(20),
  purchase_price: price,
  sale_price: price,
  work_type: z.string().max(20),
  category: z.string().max(50),
  is_title: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const text = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value))

function useChapters() {
  return useQuery({
    queryKey: ['catalog-chapters'],
    queryFn: async () => (await api.get<{ data: CatalogChapter[] }>('/catalog-chapters')).data.data,
  })
}

/** Catalogue d'articles : chapitres (= modèles d'étapes des devis) à gauche, articles à droite. */
export default function CatalogPage() {
  const { selectedId, isNew, select } = useSelection()
  const [chapterId, setChapterId] = useState<number | null>(null)
  const [query, setQuery] = useState<GridQuery>(EMPTY_QUERY)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [formVersion, setFormVersion] = useState(0)

  const chapters = useChapters()
  const chapterList = useMemo(() => chapters.data ?? [], [chapters.data])
  const list = useResourceList<CatalogArticle>('catalog-articles', useDebounced(query, 250), { chapter_id: chapterId })
  const rows = list.data?.data ?? []
  const remove = useDeleteResource('catalog-articles')

  const currentId = isNew ? null : (selectedId ?? rows[0]?.id ?? null)
  const inList = rows.find((row) => row.id === currentId) ?? null
  const single = useResourceItem<CatalogArticle>('catalog-articles', currentId, !inList)
  const article = isNew ? null : (inList ?? single.data ?? null)

  const tree = useMemo<TreeNode[]>(() => {
    const label = (chapter: CatalogChapter) => `${chapter.code} - ${chapter.label}`
    return chapterList
      .filter((chapter) => chapter.parent_id === null)
      .map((chapter) => ({
        id: String(chapter.id),
        label: label(chapter),
        children: chapterList
          .filter((child) => child.parent_id === chapter.id)
          .map((child) => ({ id: String(child.id), label: label(child) })),
      }))
  }, [chapterList])

  const currentChapter = chapterList.find((chapter) => chapter.id === chapterId) ?? null

  function onDelete() {
    if (!article || !window.confirm('Supprimer cet article du catalogue ?')) {
      return
    }
    remove.mutate(article.id, {
      onSuccess: () => {
        toast('Article supprimé.', 'success')
        select(null)
      },
    })
  }

  return (
    <Workspace
      entries={list.data?.meta.total ?? null}
      statusRight={SAVE_LABELS[saveState]}
      tabLabel="Catalogue d'articles"
      asideWidth={300}
      toolbar={
        <>
          <StandardTools
            newLabel="Nouvel article"
            onNew={() => {
              select('new')
              setSaveState('idle')
            }}
            formId={FORM_ID}
            onUndo={() => {
              setFormVersion((value) => value + 1)
              setSaveState('idle')
            }}
            onDelete={onDelete}
            canDelete={Boolean(article)}
          />
          <ToolMenu icon="import" label="Import" />
          <ToolMenu icon="export" label="Export" />
          <ToolSep />
          <span className="text-[12px] text-gray-500">
            {currentChapter ? `Chapitre ${currentChapter.code} - ${currentChapter.label}` : 'Tous les chapitres'}
          </span>
        </>
      }
      aside={
        <AsidePanel title="Chapitres" nav={[{ icon: 'tree', label: 'Chapitres / modèles d’étapes', active: true }]}>
          <p className="text-[12px] text-gray-400">
            Chaque chapitre sert de modèle d'étape : on le choisit dans un devis pour créer l'étape avec ses articles.
          </p>
          <button
            type="button"
            onClick={() => {
              setChapterId(null)
              setQuery({ ...query, page: 1 })
            }}
            className={`mt-2 flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] ${
              chapterId === null ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon name="book" className="h-4 w-4" />
            Tous les chapitres
          </button>
          <div className="mt-1">
            <Tree
              nodes={tree}
              selectedId={chapterId ? String(chapterId) : null}
              onSelect={(node) => {
                setChapterId(Number(node.id))
                setQuery({ ...query, page: 1 })
                select(null)
              }}
            />
          </div>
          <ChapterEditor key={chapterId ?? 'none'} chapter={currentChapter} chapters={chapterList} onDeleted={() => setChapterId(null)} />
        </AsidePanel>
      }
    >
      <div className="flex h-full flex-col">
        <ArticleForm
          key={`${isNew ? 'new' : (article?.id ?? 'none')}-${formVersion}`}
          article={article}
          isNew={isNew}
          chapters={chapterList}
          defaultChapterId={chapterId}
          disabled={!isNew && !article}
          onStateChange={setSaveState}
          onCreated={(created) => select(created.id)}
        />
        <DataGrid
          className="min-h-0 flex-1"
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => String(row.id)}
          rowClass={(row, index) => (row.is_title ? 'bg-gray-100 font-semibold' : index % 2 ? 'bg-bb-row' : 'bg-white')}
          selectedKey={currentId ? String(currentId) : null}
          onSelect={(row) => {
            select(row.id)
            setSaveState('idle')
          }}
          query={query}
          onQueryChange={(next) => setQuery({ ...next, page: 1 })}
          emptyText={list.isLoading ? 'Chargement…' : 'Aucun article dans ce chapitre.'}
        />
        <GridPager meta={list.data?.meta} onPage={(page) => setQuery({ ...query, page })} loading={list.isFetching} />
      </div>
    </Workspace>
  )
}

/** Ajout, renommage et suppression d'un chapitre, sous l'arbre. */
function ChapterEditor({
  chapter,
  chapters,
  onDeleted,
}: {
  chapter: CatalogChapter | null
  chapters: CatalogChapter[]
  onDeleted: () => void
}) {
  const save = useSaveResource<CatalogChapter, Record<string, unknown>>('catalog-chapters')
  const remove = useDeleteResource('catalog-chapters')
  const [mode, setMode] = useState<'edit' | 'new'>(chapter ? 'edit' : 'new')
  const editing = mode === 'edit' && chapter
  const [code, setCode] = useState(editing ? chapter.code : '')
  const [label, setLabel] = useState(editing ? chapter.label : '')
  const [asChild, setAsChild] = useState(false)

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!code.trim() || !label.trim()) {
      return
    }
    const parentId = editing ? chapter.parent_id : asChild && chapter ? chapter.id : null
    save.mutate(
      { id: editing ? chapter.id : null, payload: { code: code.trim(), label: label.trim(), parent_id: parentId, position: editing ? chapter.position : chapters.length } },
      {
        onSuccess: () => {
          toast(editing ? 'Chapitre mis à jour.' : 'Chapitre ajouté.', 'success')
          if (!editing) {
            setCode('')
            setLabel('')
          }
        },
        onError: () => toast("Le chapitre n'a pas pu être enregistré.", 'error'),
      },
    )
  }

  function onDelete() {
    if (!chapter || !window.confirm(`Supprimer le chapitre « ${chapter.code} - ${chapter.label} » ?`)) {
      return
    }
    remove.mutate(chapter.id, {
      onSuccess: () => {
        toast('Chapitre supprimé.', 'success')
        onDeleted()
      },
      onError: (error) => {
        toast(isAxiosError(error) ? (error.response?.data?.message ?? 'Suppression impossible.') : 'Suppression impossible.', 'error')
      },
    })
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-1 text-[12px]">
        {chapter && (
          <button
            type="button"
            onClick={() => {
              setMode('edit')
              setCode(chapter.code)
              setLabel(chapter.label)
            }}
            className={`rounded-md px-2 py-1 ${mode === 'edit' ? 'bg-white font-medium text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            Modifier
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMode('new')
            setCode('')
            setLabel('')
          }}
          className={`rounded-md px-2 py-1 ${mode === 'new' ? 'bg-white font-medium text-gray-800 shadow-sm' : 'text-gray-500'}`}
        >
          Nouveau chapitre
        </button>
      </div>
      <div className="flex gap-2">
        <BbInput value={code} onChange={(event) => setCode(event.target.value)} placeholder="Code" className="w-16" maxLength={20} />
        <BbInput value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Libellé" className="min-w-0 flex-1" maxLength={255} />
      </div>
      {mode === 'new' && chapter && chapter.parent_id === null && (
        <BbCheckbox label={`Sous-chapitre de ${chapter.code}`} checked={asChild} onChange={(event) => setAsChild(event.target.checked)} />
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={save.isPending || !code.trim() || !label.trim()}
          className="h-8 rounded-md bg-anthracite-800 px-3 text-[13px] font-medium text-white hover:bg-anthracite-700 disabled:opacity-40"
        >
          {mode === 'edit' ? 'Enregistrer' : 'Ajouter'}
        </button>
        {mode === 'edit' && chapter && (
          <button type="button" onClick={onDelete} className="h-8 rounded-md px-2 text-[13px] text-red-600 hover:bg-red-50">
            Supprimer
          </button>
        )}
      </div>
    </form>
  )
}

interface ArticleFormProps {
  article: CatalogArticle | null
  isNew: boolean
  chapters: CatalogChapter[]
  defaultChapterId: number | null
  disabled: boolean
  onStateChange: (state: SaveState) => void
  onCreated: (article: CatalogArticle) => void
}

function ArticleForm({ article, isNew, chapters, defaultChapterId, disabled, onStateChange, onCreated }: ArticleFormProps) {
  const save = useSaveResource<CatalogArticle, Record<string, unknown>>('catalog-articles')
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      catalog_chapter_id: String(article?.catalog_chapter_id ?? defaultChapterId ?? ''),
      code: article?.code ?? '',
      sub_code: article?.sub_code ?? '',
      description: article?.description ?? '',
      unit: article?.unit ?? '',
      purchase_price: text(article?.purchase_price),
      sale_price: text(article?.sale_price),
      work_type: article?.work_type ?? '',
      category: article?.category ?? '',
      is_title: article?.is_title ?? false,
    },
  })
  const { register, formState } = form
  const errors = formState.errors
  const firstError = Object.values(errors)[0]?.message

  const { submit, onBlur } = useEntityForm(form, {
    isNew,
    onStateChange,
    save: async (values) => {
      const saved = await save.mutateAsync({
        id: article?.id ?? null,
        payload: {
          catalog_chapter_id: Number(values.catalog_chapter_id),
          code: nullable(values.code),
          sub_code: nullable(values.sub_code),
          description: values.description.trim(),
          unit: nullable(values.unit),
          purchase_price: toNumber(values.purchase_price),
          sale_price: toNumber(values.sale_price),
          work_type: nullable(values.work_type),
          category: nullable(values.category),
          is_title: values.is_title,
        },
      })
      if (!article) {
        toast('Article créé.', 'success')
        onCreated(saved)
      }
    },
  })

  const ordered = chapters
    .filter((chapter) => chapter.parent_id === null)
    .flatMap((chapter) => [chapter, ...chapters.filter((child) => child.parent_id === chapter.id)])

  return (
    <form id={FORM_ID} onSubmit={submit} onBlur={onBlur} className="shrink-0 border-b border-gray-200 px-4 pb-4 pt-4">
      <SectionTitle>{isNew ? 'Nouvel article' : 'Article'}</SectionTitle>
      <fieldset disabled={disabled} className="grid grid-cols-[max-content_max-content] gap-x-12 gap-y-2">
        <Field label="Chapitre" labelWidth={90}>
          <BbSelect className="w-[420px]" {...register('catalog_chapter_id')}>
            <option value="">— choisir —</option>
            {ordered.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.parent_id ? '   ' : ''}
                {chapter.code} - {chapter.label}
              </option>
            ))}
          </BbSelect>
        </Field>
        <Field label="Unité" labelWidth={100}>
          <BbInput className="w-24" list="catalog-units" {...register('unit')} />
          <datalist id="catalog-units">
            {['H.', 'Jour', 'Pce', 'M1', 'M2', 'M3', 'Kg', 'To', 'Bloc', 'MS', 'L'].map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
          <BbCheckbox label="Titre de chapitre" className="ml-4" {...register('is_title')} />
        </Field>

        <Field label="Code" labelWidth={90}>
          <BbInput className="w-24" autoFocus={isNew} {...register('code')} />
          <span className="ml-2 text-gray-500">Sous-code</span>
          <BbInput className="w-24" {...register('sub_code')} />
        </Field>
        <Field label="Prix d'achat" labelWidth={100}>
          <BbInput className="w-28 text-right" invalid={Boolean(errors.purchase_price)} {...register('purchase_price')} />
          <span className="ml-3 text-gray-500">Prix de vente</span>
          <BbInput className="w-28 text-right" invalid={Boolean(errors.sale_price)} {...register('sale_price')} />
        </Field>

        <div className="row-span-2 flex items-start gap-2">
          <span className="w-[90px] shrink-0 pt-1.5 text-[13px] text-gray-500">Description</span>
          <BbTextarea rows={3} className={`w-[420px] ${errors.description ? 'border-red-400' : ''}`} {...register('description')} />
        </div>
        <Field label="Type de travail" labelWidth={100}>
          <BbInput className="w-28" {...register('work_type')} />
        </Field>
        <Field label="Catégorie" labelWidth={100}>
          <BbInput className="w-56" {...register('category')} />
        </Field>
      </fieldset>
      {firstError && <p className="mt-2 text-[12px] text-red-600">{firstError}</p>}
    </form>
  )
}
