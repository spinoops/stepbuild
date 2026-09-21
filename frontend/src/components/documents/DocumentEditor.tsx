import { useState } from 'react'
import { isAxiosError } from 'axios'
import ArticlePicker from '@/components/documents/ArticlePicker'
import PositionRow from '@/components/documents/PositionRow'
import { useCreateArticleOnTheFly } from '@/hooks/useDocuments'
import type { DocumentActions, PositionPayload } from '@/hooks/useDocuments'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import type { DocumentDetail, DocumentStep } from '@/types'
import { Icon } from '@/components/icons'

interface DocumentEditorProps {
  document: DocumentDetail
  actions: DocumentActions
  onSaving: (saving: boolean) => void
}

/** Détail du devis : une section par étape, positions éditables en place, champ d'ajout rapide. */
export default function DocumentEditor({ document: doc, actions, onSaving }: DocumentEditorProps) {
  const createArticle = useCreateArticleOnTheFly()
  const [busyStep, setBusyStep] = useState<number | null>(null)
  const steps = doc.steps ?? []

  /** Ajoute une position puis place le curseur sur sa quantité (ou reste sur le champ d'ajout). */
  async function add(step: DocumentStep, payload: PositionPayload, focusQuantity: boolean) {
    setBusyStep(step.id)
    try {
      const id = await actions.addPosition({ document_step_id: step.id, ...payload })
      window.setTimeout(() => {
        const selector = focusQuantity && id ? `[data-qty="${id}"]` : `[data-picker="${step.id}"]`
        window.document.querySelector<HTMLInputElement>(selector)?.focus()
      }, 60)
    } catch (error) {
      toast(isAxiosError(error) ? (error.response?.data?.message ?? "L'ajout a échoué.") : "L'ajout a échoué.", 'error')
    } finally {
      setBusyStep(null)
    }
  }

  async function createAndAdd(step: DocumentStep, description: string) {
    if (!step.catalog_chapter_id) {
      return
    }
    try {
      const article = await createArticle.mutateAsync({ catalog_chapter_id: step.catalog_chapter_id, description })
      toast('Article ajouté au catalogue. Pensez à compléter son unité et son prix.', 'success')
      await add(step, { catalog_article_id: article.id }, true)
    } catch {
      toast("L'article n'a pas pu être créé.", 'error')
    }
  }

  function move(step: DocumentStep, index: number, direction: -1 | 1) {
    const ids = step.positions.map((position) => position.id)
    const target = index + direction
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void actions.reorderPositions(step.id, ids)
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-gray-500">
        <Icon name="tree" className="h-8 w-8 text-gray-300" />
        <p className="font-medium text-gray-700">Ce devis n'a pas encore d'étape.</p>
        <p className="max-w-md text-[13px]">
          Ajoutez les étapes du chantier depuis les modèles, dans le panneau de gauche. Chaque modèle apporte ses
          articles et leurs prix ; il ne reste qu'à saisir les quantités.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[980px] border-collapse text-[13px]">
        <thead className="sticky top-0 z-10 bg-bb-ribbon text-[12px] font-semibold text-gray-500">
          <tr>
            <th className="border-b border-gray-200 py-2 pl-4 text-left">N° pos.</th>
            <th className="border-b border-gray-200 px-1.5 py-2 text-left">Description</th>
            <th className="border-b border-gray-200 px-1.5 py-2 text-left">Un.</th>
            <th className="border-b border-gray-200 px-1.5 py-2 text-right">Quantité</th>
            <th className="border-b border-gray-200 px-1.5 py-2 text-right">Prix CHF</th>
            <th className="border-b border-gray-200 px-3 py-2 text-right">Montant CHF</th>
            <th className="border-b border-gray-200 py-2 text-center" title="Option : hors total">Opt.</th>
            <th className="border-b border-gray-200" />
          </tr>
        </thead>
        {steps.map((step) => (
          <tbody key={step.id} id={`step-${step.id}`} className="scroll-mt-10">
            <tr className="bg-gray-100">
              <td className="border-b border-gray-200 py-2 pl-4 font-semibold text-gray-500">{step.code}</td>
              <td colSpan={4} className="border-b border-gray-200 px-1.5 py-2 font-semibold uppercase tracking-wide text-gray-800">
                {step.label}
              </td>
              <td className="border-b border-gray-200 px-3 py-2 text-right font-semibold tabular-nums text-gray-800">
                {fmtAmount(step.total)}
              </td>
              <td colSpan={2} className="border-b border-gray-200" />
            </tr>
            {step.positions.map((position, index) => (
              <PositionRow
                key={position.id}
                position={position}
                actions={actions}
                isFirst={index === 0}
                isLast={index === step.positions.length - 1}
                onMove={(direction) => move(step, index, direction)}
                onSaving={onSaving}
              />
            ))}
            <tr>
              <td className="border-b border-gray-200" />
              <td colSpan={7} className="border-b border-gray-200 px-1.5 py-2">
                <ArticlePicker
                  stepId={step.id}
                  canCreateArticle={Boolean(step.catalog_chapter_id)}
                  busy={busyStep === step.id}
                  onPickArticle={(article) => void add(step, { catalog_article_id: article.id }, true)}
                  onFreeLine={(description) => void add(step, { description, kind: 'item' }, true)}
                  onCreateArticle={(description) => void createAndAdd(step, description)}
                />
              </td>
            </tr>
          </tbody>
        ))}
      </table>
    </div>
  )
}
