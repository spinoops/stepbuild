import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Workspace, { AsidePanel } from '@/components/baubit/Workspace'
import { ToolButton, ToolPrimary, ToolSep } from '@/components/baubit/Toolbar'
import { BbCheckbox, BbInput, BbSelect, BbTextarea, Field, SectionTitle } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import { SAVE_LABELS } from '@/hooks/useEntityForm'
import type { SaveState } from '@/hooks/useEntityForm'
import { useDeleteQuoteTemplate, useQuoteTemplates, useSaveQuoteTemplate } from '@/hooks/useQuoteTemplates'
import type { QuoteTemplateStepPayload } from '@/hooks/useQuoteTemplates'
import { useSelection } from '@/hooks/useSelection'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { CatalogChapter, QuoteTemplate } from '@/types'

interface Draft {
  name: string
  description: string
  is_default: boolean
  steps: QuoteTemplateStepPayload[]
}

const EMPTY: Draft = { name: '', description: '', is_default: false, steps: [] }

function toDraft(template: QuoteTemplate | null): Draft {
  return template
    ? {
        name: template.name,
        description: template.description ?? '',
        is_default: template.is_default,
        steps: (template.steps ?? []).map((step) => ({
          catalog_chapter_id: step.catalog_chapter_id,
          code: step.code,
          label: step.label,
          with_articles: step.with_articles,
        })),
      }
    : EMPTY
}

/**
 * Modèles de devis : un jeu d'étapes prêt à l'emploi (chapitres du catalogue ou étapes libres).
 * À la création d'un devis, le modèle choisi crée toutes ses étapes d'un coup.
 */
export default function QuoteTemplatesPage() {
  const { selectedId, isNew, select } = useSelection()
  const templates = useQuoteTemplates()
  const list = templates.data ?? []
  const currentId = isNew ? null : (selectedId ?? list[0]?.id ?? null)
  const template = isNew ? null : (list.find((item) => item.id === currentId) ?? null)
  const remove = useDeleteQuoteTemplate()
  const [saveState, setSaveState] = useState<SaveState>('idle')

  function onDelete() {
    if (!template || !window.confirm(`Supprimer le modèle « ${template.name} » ?`)) {
      return
    }
    remove.mutate(template.id, {
      onSuccess: () => {
        toast('Modèle supprimé.', 'success')
        select(null)
      },
    })
  }

  return (
    <Workspace
      tabLabel="Modèles de devis"
      entries={list.length}
      statusRight={SAVE_LABELS[saveState]}
      asideWidth={300}
      toolbar={
        <>
          <ToolPrimary label="Nouveau modèle" onClick={() => select('new')} />
          <ToolSep />
          <button type="submit" form="quote-template-form" title="Enregistrer (Ctrl+S)" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100">
            <Icon name="save" className="h-4 w-4 text-primary-600" />
          </button>
          <ToolButton icon="trash" title="Supprimer le modèle" tone="danger" onClick={onDelete} disabled={!template} />
        </>
      }
      aside={
        <AsidePanel title="Modèles" nav={[{ icon: 'tree', label: 'Modèles de devis', active: true }]}>
          <p className="text-[12px] text-gray-400">
            Un modèle rassemble les étapes générales d'un type de chantier. Le modèle par défaut s'applique à chaque nouveau devis.
          </p>
          <ul className="mt-2 space-y-0.5">
            {list.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    select(item.id)
                    setSaveState('idle')
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                    item.id === currentId ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon name="tree" className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {item.is_default && <span className="rounded-full bg-gray-100 px-1.5 text-[10px] text-gray-500">défaut</span>}
                  <span className="text-[11px] text-gray-400">{item.steps?.length ?? 0}</span>
                </button>
              </li>
            ))}
            {list.length === 0 && !templates.isLoading && <li className="px-2 text-[13px] text-gray-400">Aucun modèle pour l'instant.</li>}
          </ul>
        </AsidePanel>
      }
    >
      {isNew || template ? (
        <TemplateEditor
          key={isNew ? 'new' : template!.id}
          template={template}
          onStateChange={setSaveState}
          onSaved={(saved) => {
            if (!template) {
              select(saved.id)
            }
          }}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-gray-500">
          <Icon name="tree" className="h-8 w-8 text-gray-300" />
          <p className="font-medium text-gray-700">Aucun modèle de devis.</p>
          <p className="max-w-md text-[13px]">Créez un modèle avec les étapes générales de vos chantiers, ou enregistrez un devis existant comme modèle.</p>
        </div>
      )}
    </Workspace>
  )
}

interface EditorProps {
  template: QuoteTemplate | null
  onStateChange: (state: SaveState) => void
  onSaved: (template: QuoteTemplate) => void
}

function TemplateEditor({ template, onStateChange, onSaved }: EditorProps) {
  const save = useSaveQuoteTemplate()
  const [draft, setDraft] = useState<Draft>(() => toDraft(template))
  const [chapterId, setChapterId] = useState('')
  const [withArticles, setWithArticles] = useState(true)
  const [free, setFree] = useState({ code: '', label: '' })
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dirty = useRef(false)

  const chapters = useQuery({
    queryKey: ['catalog-chapters'],
    queryFn: async () => (await api.get<{ data: CatalogChapter[] }>('/catalog-chapters')).data.data,
    staleTime: 60_000,
  })
  const ordered = (chapters.data ?? [])
    .filter((chapter) => chapter.parent_id === null)
    .flatMap((chapter) => [chapter, ...(chapters.data ?? []).filter((child) => child.parent_id === chapter.id)])

  function change(patch: Partial<Draft>) {
    dirty.current = true
    onStateChange('dirty')
    setDraft((current) => ({ ...current, ...patch }))
  }

  async function submit(event?: React.FormEvent) {
    event?.preventDefault()
    if (!draft.name.trim()) {
      toast('Donnez un nom au modèle.', 'error')
      return
    }
    onStateChange('saving')
    try {
      const saved = await save.mutateAsync({
        id: template?.id ?? null,
        payload: { ...draft, name: draft.name.trim(), description: draft.description.trim() || null },
      })
      dirty.current = false
      onStateChange('saved')
      if (!template) {
        toast(`Modèle « ${saved.name} » créé.`, 'success')
      }
      onSaved(saved)
    } catch {
      onStateChange('error')
      toast("Le modèle n'a pas pu être enregistré.", 'error')
    }
  }

  // Ctrl+S.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void submit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function addFromChapter() {
    const chapter = chapters.data?.find((item) => String(item.id) === chapterId)
    if (!chapter) {
      return
    }
    if (draft.steps.some((step) => step.catalog_chapter_id === chapter.id)) {
      toast('Ce chapitre est déjà dans le modèle.', 'info')
      return
    }
    change({ steps: [...draft.steps, { catalog_chapter_id: chapter.id, code: chapter.code, label: chapter.label, with_articles: withArticles }] })
    setChapterId('')
  }

  function addFree(event: React.FormEvent) {
    event.preventDefault()
    if (!free.code.trim() || !free.label.trim()) {
      return
    }
    change({ steps: [...draft.steps, { catalog_chapter_id: null, code: free.code.trim(), label: free.label.trim(), with_articles: false }] })
    setFree({ code: '', label: '' })
  }

  function moveStep(from: number, to: number) {
    if (from === to || to < 0 || to >= draft.steps.length) {
      return
    }
    const steps = [...draft.steps]
    const [moved] = steps.splice(from, 1)
    steps.splice(to, 0, moved)
    change({ steps })
  }

  return (
    <form id="quote-template-form" onSubmit={submit} className="min-h-0 flex-1 overflow-auto p-5">
      <div className="flex flex-wrap gap-x-12 gap-y-6">
        <div className="w-[460px] space-y-2">
          <SectionTitle>{template ? 'Modèle de devis' : 'Nouveau modèle de devis'}</SectionTitle>
          <Field label="Nom" labelWidth={90}>
            <BbInput value={draft.name} onChange={(e) => change({ name: e.target.value })} className="w-80" autoFocus={!template} placeholder="ex. Rénovation standard" />
          </Field>
          <div className="flex items-start gap-2">
            <span className="w-[90px] shrink-0 pt-1.5 text-[13px] text-gray-500">Description</span>
            <BbTextarea value={draft.description} onChange={(e) => change({ description: e.target.value })} rows={3} className="w-80" />
          </div>
          <Field label="" labelWidth={90}>
            <BbCheckbox label="Modèle par défaut pour les nouveaux devis" checked={draft.is_default} onChange={(e) => change({ is_default: e.target.checked })} />
          </Field>
        </div>

        <div className="w-[560px]">
          <SectionTitle>Étapes du modèle</SectionTitle>
          <ol className="space-y-1">
            {draft.steps.map((step, index) => (
              <li
                key={`${step.catalog_chapter_id ?? 'free'}-${step.code}-${index}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setOverIndex(index)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (dragIndex !== null) {
                    moveStep(dragIndex, index)
                  }
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                  overIndex === index && dragIndex !== null && dragIndex !== index ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
                } ${dragIndex === index ? 'opacity-40' : ''}`}
              >
                <button
                  type="button"
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setOverIndex(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                      event.preventDefault()
                      moveStep(index, index + (event.key === 'ArrowUp' ? -1 : 1))
                    }
                  }}
                  title="Glisser pour déplacer (au clavier : flèches haut et bas)"
                  className="cursor-grab rounded text-gray-300 hover:text-gray-600 focus:text-primary-600 focus:outline-none active:cursor-grabbing"
                >
                  <Icon name="grip" className="h-4 w-4" />
                </button>
                <span className="w-7 shrink-0 text-[12px] text-gray-400">{step.code}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-gray-800">{step.label}</span>
                {step.catalog_chapter_id ? (
                  <BbCheckbox
                    label="avec articles"
                    checked={step.with_articles}
                    onChange={(e) => change({ steps: draft.steps.map((item, i) => (i === index ? { ...item, with_articles: e.target.checked } : item)) })}
                    className="shrink-0 text-[12px] text-gray-500"
                  />
                ) : (
                  <span className="shrink-0 text-[11px] uppercase tracking-wider text-gray-300">libre</span>
                )}
                <button
                  type="button"
                  title="Retirer l'étape"
                  onClick={() => change({ steps: draft.steps.filter((_, i) => i !== index) })}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {draft.steps.length === 0 && <li className="text-[13px] text-gray-400">Aucune étape. Ajoutez-en ci-dessous.</li>}
          </ol>

          <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Ajouter une étape</div>
            <div className="flex gap-2">
              <BbSelect value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="min-w-0 flex-1">
                <option value="">— chapitre du catalogue —</option>
                {ordered.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.parent_id ? '   ' : ''}
                    {chapter.code} - {chapter.label}
                  </option>
                ))}
              </BbSelect>
              <button type="button" onClick={addFromChapter} disabled={!chapterId} className="h-8 rounded-md bg-anthracite-800 px-3 text-[13px] font-medium text-white hover:bg-anthracite-700 disabled:opacity-40">
                Ajouter
              </button>
            </div>
            <BbCheckbox label="Avec ses articles et leurs prix" checked={withArticles} onChange={(e) => setWithArticles(e.target.checked)} />
            <div className="flex gap-1 pt-1">
              <BbInput value={free.code} onChange={(e) => setFree({ ...free, code: e.target.value })} placeholder="Code" className="w-16" maxLength={20} />
              <BbInput value={free.label} onChange={(e) => setFree({ ...free, label: e.target.value })} placeholder="Étape libre" className="min-w-0 flex-1" maxLength={255} onKeyDown={(e) => e.key === 'Enter' && addFree(e)} />
              <button type="button" onClick={addFree} disabled={!free.code.trim() || !free.label.trim()} title="Ajouter l'étape libre" className="rounded-md border border-gray-200 bg-white px-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button type="submit" disabled={save.isPending} className="mt-4 h-8 rounded-md bg-accent-600 px-4 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40">
            {template ? 'Enregistrer le modèle' : 'Créer le modèle'}
          </button>
        </div>
      </div>
    </form>
  )
}
