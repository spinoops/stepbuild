import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BbCheckbox, BbInput, BbSelect } from '@/components/baubit/Form'
import type { DocumentActions } from '@/hooks/useDocuments'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import type { CatalogChapter, DocumentDetail, DocumentStep } from '@/types'
import { Icon } from '@/components/icons'

interface StepsPanelProps {
  document: DocumentDetail
  actions: DocumentActions
}

/**
 * Étapes du devis : ce sont les étapes du chantier, reprises ensuite par les rapports journaliers,
 * la régie et la facture. On les ajoute depuis les modèles (chapitres du catalogue) ou librement.
 */
export default function StepsPanel({ document: doc, actions }: StepsPanelProps) {
  const steps = doc.steps ?? []
  const [chapterId, setChapterId] = useState('')
  const [withArticles, setWithArticles] = useState(true)
  const [free, setFree] = useState({ code: '', label: '' })
  const [editing, setEditing] = useState<{ id: number; code: string; label: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const chapters = useQuery({
    queryKey: ['catalog-chapters'],
    queryFn: async () => (await api.get<{ data: CatalogChapter[] }>('/catalog-chapters')).data.data,
    staleTime: 60_000,
  })
  const ordered = (chapters.data ?? [])
    .filter((chapter) => chapter.parent_id === null)
    .flatMap((chapter) => [chapter, ...(chapters.data ?? []).filter((child) => child.parent_id === chapter.id)])
  const used = new Set(steps.map((step) => step.catalog_chapter_id))

  async function run(task: () => Promise<unknown>, success?: string) {
    setBusy(true)
    try {
      await task()
      if (success) {
        toast(success, 'success')
      }
    } catch {
      toast("L'opération a échoué.", 'error')
    } finally {
      setBusy(false)
    }
  }

  function addFromModel() {
    if (!chapterId) {
      return
    }
    void run(async () => {
      await actions.addStep({ catalog_chapter_id: Number(chapterId), with_articles: withArticles })
      setChapterId('')
    }, 'Étape ajoutée au devis.')
  }

  function addFree(event: React.FormEvent) {
    event.preventDefault()
    if (!free.code.trim() || !free.label.trim()) {
      return
    }
    void run(async () => {
      await actions.addStep({ code: free.code.trim(), label: free.label.trim() })
      setFree({ code: '', label: '' })
    }, 'Étape ajoutée au devis.')
  }

  function move(index: number, direction: -1 | 1) {
    const ids = steps.map((step) => step.id)
    ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
    void run(() => actions.reorderSteps(ids))
  }

  function remove(step: DocumentStep) {
    const count = step.positions.length
    const message = count
      ? `Supprimer l'étape « ${step.label} » et ses ${count} position${count > 1 ? 's' : ''} ?`
      : `Supprimer l'étape « ${step.label} » ?`
    if (window.confirm(message)) {
      void run(() => actions.deleteStep(step.id))
    }
  }

  return (
    <>
      <div className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Étapes du devis</div>
      <p className="mt-1 text-[12px] text-gray-400">Rapports journaliers, régie et facture se rattachent à ces étapes.</p>

      <ul className="mt-2 space-y-0.5">
        {steps.map((step, index) =>
          editing?.id === step.id ? (
            <li key={step.id}>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void run(async () => {
                    await actions.updateStep(step.id, { code: editing.code.trim(), label: editing.label.trim() })
                    setEditing(null)
                  })
                }}
                className="flex gap-1 rounded-md bg-primary-50 p-1"
              >
                <BbInput value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} className="w-12 px-1.5" autoFocus />
                <BbInput value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} className="min-w-0 flex-1 px-1.5" />
                <button type="submit" title="Valider" className="rounded-md px-1.5 text-primary-700 hover:bg-white">
                  <Icon name="check" className="h-4 w-4" />
                </button>
              </form>
            </li>
          ) : (
            <li key={step.id} className="group flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-gray-100">
              <button
                type="button"
                onClick={() => window.document.getElementById(`step-${step.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="flex min-w-0 flex-1 items-baseline gap-2 text-left text-[13px]"
                title="Aller à l'étape"
              >
                <span className="w-6 shrink-0 text-[12px] text-gray-400">{step.code}</span>
                <span className="truncate text-gray-800">{step.label}</span>
              </button>
              <span className="shrink-0 text-[12px] tabular-nums text-gray-500 group-hover:hidden">{fmtAmount(step.total)}</span>
              <span className="hidden shrink-0 group-hover:flex">
                <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} title="Monter" className="rounded p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-20">
                  <Icon name="chevrondown" className="h-3.5 w-3.5 rotate-180" />
                </button>
                <button type="button" disabled={busy || index === steps.length - 1} onClick={() => move(index, 1)} title="Descendre" className="rounded p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-20">
                  <Icon name="chevrondown" className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setEditing({ id: step.id, code: step.code, label: step.label })} title="Renommer" className="rounded p-0.5 text-gray-400 hover:text-gray-800">
                  <Icon name="edit" className="h-3.5 w-3.5" />
                </button>
                <button type="button" disabled={busy} onClick={() => remove(step)} title="Supprimer l'étape" className="rounded p-0.5 text-gray-400 hover:text-red-600">
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ),
        )}
        {steps.length === 0 && <li className="px-1.5 text-[13px] text-gray-400">Aucune étape pour l'instant.</li>}
      </ul>

      <div className="mt-5 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Ajouter depuis un modèle</div>
      <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5">
        <BbSelect value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="w-full">
          <option value="">— choisir un modèle d'étape —</option>
          {ordered.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.parent_id ? '   ' : ''}
              {chapter.code} - {chapter.label}
              {used.has(chapter.id) ? '  ✓' : ''}
            </option>
          ))}
        </BbSelect>
        <BbCheckbox label="Avec ses articles et leurs prix" checked={withArticles} onChange={(e) => setWithArticles(e.target.checked)} />
        <button
          type="button"
          onClick={addFromModel}
          disabled={busy || !chapterId}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-accent-600 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40"
        >
          <Icon name="plus" className="h-4 w-4" />
          Ajouter l'étape
        </button>
      </div>

      <form onSubmit={addFree} className="mt-3">
        <div className="text-[12px] text-gray-400">Ou une étape libre :</div>
        <div className="mt-1 flex gap-1">
          <BbInput value={free.code} onChange={(e) => setFree({ ...free, code: e.target.value })} placeholder="Code" className="w-14 px-1.5" maxLength={20} />
          <BbInput value={free.label} onChange={(e) => setFree({ ...free, label: e.target.value })} placeholder="Libellé de l'étape" className="min-w-0 flex-1" maxLength={255} />
          <button type="submit" disabled={busy || !free.code.trim() || !free.label.trim()} title="Ajouter l'étape libre" className="rounded-md border border-gray-200 px-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </form>
    </>
  )
}
