import { useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import ArticlePicker from '@/components/documents/ArticlePicker'
import PositionRow from '@/components/documents/PositionRow'
import type { DropPlace } from '@/components/documents/PositionRow'
import { useCreateArticleOnTheFly } from '@/hooks/useDocuments'
import type { DocumentActions, PositionPayload } from '@/hooks/useDocuments'
import { fmtAmount } from '@/lib/format'
import { toast } from '@/lib/toast'
import type { DocumentDetail, DocumentPosition, DocumentStep } from '@/types'
import { Icon } from '@/components/icons'

interface DocumentEditorProps {
  document: DocumentDetail
  actions: DocumentActions
  onSaving: (saving: boolean) => void
}

interface DragState {
  stepId: number
  positionId: number
}

interface DropTarget {
  stepId: number
  /** Ligne visée, ou null pour « en fin d'étape » (champ d'ajout). */
  positionId: number | null
  place: DropPlace
}

/** Détail du devis : une section par étape, positions éditables en place, champ d'ajout rapide. */
export default function DocumentEditor({ document: doc, actions, onSaving }: DocumentEditorProps) {
  const createArticle = useCreateArticleOnTheFly()
  const [busyStep, setBusyStep] = useState<number | null>(null)
  const [drag, setDragState] = useState<DragState | null>(null)
  // Lu dans les gestionnaires d'événements : les survols peuvent précéder le rendu suivant.
  const dragRef = useRef<DragState | null>(null)
  function setDrag(value: DragState | null) {
    dragRef.current = value
    setDragState(value)
  }
  const [target, setTarget] = useState<DropTarget | null>(null)
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

  /** Déplacement au clavier : échange avec la ligne voisine. */
  function move(step: DocumentStep, index: number, direction: -1 | 1) {
    const ids = step.positions.map((position) => position.id)
    const next = index + direction
    if (next < 0 || next >= ids.length) {
      return
    }
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    const id = ids[next]
    void actions
      .reorderPositions(step.id, ids)
      .then(() => window.document.querySelector<HTMLButtonElement>(`[data-handle="${id}"]`)?.focus())
      .catch(() => toast('Le déplacement a échoué.', 'error'))
  }

  function hover(stepId: number, positionId: number | null, place: DropPlace) {
    if (!dragRef.current) {
      return
    }
    setTarget((current) =>
      current && current.stepId === stepId && current.positionId === positionId && current.place === place
        ? current
        : { stepId, positionId, place },
    )
  }

  function payloadOf(position: DocumentPosition, stepId: number): PositionPayload {
    return {
      document_step_id: stepId,
      kind: position.kind,
      code: position.code,
      description: position.description,
      unit: position.unit,
      quantity: position.quantity,
      unit_price: position.unit_price,
      cost_price: position.cost_price,
      is_optional: position.is_optional,
      internal_remark: position.internal_remark,
    }
  }

  /** Dépose la ligne saisie : réordonne dans l'étape, ou la déplace vers une autre étape. */
  async function drop(dropTarget: DropTarget) {
    const current = dragRef.current
    setDrag(null)
    setTarget(null)
    if (!current) {
      return
    }
    const source = steps.find((step) => step.id === current.stepId)
    const destination = steps.find((step) => step.id === dropTarget.stepId)
    const position = source?.positions.find((item) => item.id === current.positionId)
    if (!source || !destination || !position) {
      return
    }

    const ids = destination.positions.map((item) => item.id).filter((id) => id !== current.positionId)
    const index = dropTarget.positionId === null ? ids.length : ids.indexOf(dropTarget.positionId) + (dropTarget.place === 'below' ? 1 : 0)
    ids.splice(index, 0, current.positionId)

    const unchanged = source.id === destination.id && ids.join() === source.positions.map((item) => item.id).join()
    if (unchanged) {
      return
    }

    onSaving(true)
    try {
      if (source.id !== destination.id) {
        await actions.updatePosition(position.id, payloadOf(position, destination.id))
      }
      await actions.reorderPositions(destination.id, ids)
    } catch {
      toast('Le déplacement a échoué.', 'error')
    } finally {
      onSaving(false)
    }
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
            <th className="border-b border-gray-200" />
            <th className="border-b border-gray-200 py-2 text-left">N° pos.</th>
            <th className="border-b border-gray-200 px-1.5 py-2 text-left">Description</th>
            <th className="border-b border-gray-200 px-1.5 py-2 text-left">Un.</th>
            <th className="border-b border-gray-200 px-1.5 py-2 text-right">Quantité</th>
            <th className="border-b border-gray-200 px-1.5 py-2 text-right">Prix CHF</th>
            <th className="border-b border-gray-200 px-3 py-2 text-right">Montant CHF</th>
            <th className="border-b border-gray-200 py-2 text-center" title="Option : hors total">Opt.</th>
            <th className="border-b border-gray-200" />
          </tr>
        </thead>
        {steps.map((step) => {
          const endTargeted = drag !== null && target?.stepId === step.id && target.positionId === null
          return (
            <tbody key={step.id} id={`step-${step.id}`} className="scroll-mt-10">
              <tr className="bg-gray-100">
                <td className="border-b border-gray-200" />
                <td className="border-b border-gray-200 py-2 font-semibold text-gray-500">{step.code}</td>
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
                  onSaving={onSaving}
                  onMove={(direction) => move(step, index, direction)}
                  dragging={drag?.positionId === position.id}
                  dropPlace={drag && target?.positionId === position.id ? target.place : null}
                  onDragStart={() => setDrag({ stepId: step.id, positionId: position.id })}
                  onDragEnd={() => {
                    setDrag(null)
                    setTarget(null)
                  }}
                  onDragOver={(place) => hover(step.id, position.id, place)}
                  onDrop={(place) => void drop({ stepId: step.id, positionId: position.id, place })}
                />
              ))}
              <tr
                onDragOver={(event) => {
                  if (dragRef.current) {
                    event.preventDefault()
                    hover(step.id, null, 'above')
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  void drop({ stepId: step.id, positionId: null, place: 'above' })
                }}
                className={endTargeted ? 'shadow-[inset_0_3px_0_0_#1d3f9c]' : ''}
              >
                <td colSpan={2} className="border-b border-gray-200" />
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
          )
        })}
      </table>
    </div>
  )
}
