import { useMemo, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import ArticlePicker from '@/components/documents/ArticlePicker'
import CostBreakdownDialog from '@/components/documents/CostBreakdownDialog'
import PositionRow from '@/components/documents/PositionRow'
import type { DropPlace } from '@/components/documents/PositionRow'
import { useCreateArticleOnTheFly } from '@/hooks/useDocuments'
import type { DocumentActions, PositionPayload } from '@/hooks/useDocuments'
import { printNumbers } from '@/lib/documentNumbering'
import { fmtAmount, fmtDate } from '@/lib/format'
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

/** Ligne chiffrable restée sans quantité. */
const isEmptyItem = (position: DocumentPosition) => position.kind === 'item' && position.quantity === null

/** Intitulé imprimé par type de document (cf. DocumentPrint::TITLES côté API). */
const PRINT_TITLES: Record<DocumentDetail['type'], string> = { devis: 'Devis estimatif', acompte: "Demande d'acompte", facture: 'Facture' }

/**
 * Détail du devis, présenté comme la feuille que le client recevra : même largeur de colonnes, même
 * numérotation (5, 5.1, sous-titre 6.1 → 6.1.1), même hiérarchie, total brut en bas. Une section par
 * étape, positions éditables en place, champ d'ajout rapide. Les outils restent dans les marges.
 */
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
  const steps = useMemo(() => doc.steps ?? [], [doc.steps])
  const numbers = useMemo(() => printNumbers(steps), [steps])
  // Sous-détail de prix ouvert, et nombre de reports de prix par position : la ligne du devis est
  // remontée (clé) après un report, pour reprendre le prix venu du serveur sans toucher à la saisie en cours.
  const [breakdownId, setBreakdownId] = useState<number | null>(null)
  const [applied, setApplied] = useState<Record<number, number>>({})
  const breakdownPosition = breakdownId === null ? null : steps.flatMap((step) => step.positions).find((item) => item.id === breakdownId) ?? null

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

  /** Retire les lignes de l'étape restées sans quantité (articles du modèle non retenus). */
  async function prune(step: DocumentStep) {
    const count = step.positions.filter(isEmptyItem).length
    if (!window.confirm(`Retirer les ${count} ligne${count > 1 ? 's' : ''} sans quantité de l'étape « ${step.label} » ?`)) {
      return
    }
    try {
      const removed = await actions.prunePositions(step.id)
      toast(`${removed} ligne${removed > 1 ? 's' : ''} retirée${removed > 1 ? 's' : ''}.`, 'success')
    } catch {
      toast('Les lignes n\'ont pas pu être retirées.', 'error')
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
    <div className="min-h-0 flex-1 overflow-auto bg-gray-100 px-4 py-5">
      {/* La feuille : 717 px de zone imprimée (172 mm du PDF), une marge d'outils de chaque côté. */}
      <div className="mx-auto w-[869px] rounded-sm border border-gray-200 bg-white pb-12 pl-9 pr-3 pt-8 text-[14px] text-gray-900 shadow-sm" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
        <div className="ml-7 mr-[76px] flex items-start justify-between border-b border-gray-300 pb-2">
          <div className="min-w-0">
            <div className="font-bold">
              {PRINT_TITLES[doc.type]} N° {doc.number}
            </div>
            <div className="truncate text-[12px] text-gray-500">
              Projet : {doc.project?.number} {doc.project?.designation1}
            </div>
          </div>
          <div className="shrink-0 text-[12px] text-gray-500">{fmtDate(doc.date)}</div>
        </div>

        <table className="mt-3 w-[821px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[28px]" />
            <col className="w-[54px]" />
            <col className="w-[338px]" />
            <col className="w-[54px]" />
            <col className="w-[75px]" />
            <col className="w-[92px]" />
            <col className="w-[104px]" />
            <col className="w-[76px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-white text-[12px] text-gray-500">
            <tr>
              <th />
              <th className="border-b border-gray-900 px-1 py-1.5 text-left font-normal">Pos.</th>
              <th className="border-b border-gray-900 px-1 py-1.5 text-left font-normal">Description</th>
              <th className="border-b border-gray-900 px-1 py-1.5 text-left font-normal">Un.</th>
              <th className="border-b border-gray-900 px-1 py-1.5 text-right font-normal">Quantité</th>
              <th className="border-b border-gray-900 px-1 py-1.5 text-right font-normal">Prix</th>
              <th className="border-b border-gray-900 px-1 py-1.5 text-right font-normal">Montant</th>
              <th />
            </tr>
          </thead>
          {steps.map((step, stepIndex) => {
            const endTargeted = drag !== null && target?.stepId === step.id && target.positionId === null
            const empty = step.positions.filter(isEmptyItem).length
            return (
              <tbody key={step.id} id={`step-${step.id}`} className="scroll-mt-10">
                <tr className="font-bold">
                  <td />
                  <td className="border-b border-gray-400 px-1 pb-1 pt-5">{stepIndex + 1}</td>
                  <td colSpan={4} className="border-b border-gray-400 px-1 pb-1 pt-5">
                    {step.label}
                  </td>
                  <td
                    className="border-b border-gray-400 px-1 pb-1 pt-5 text-right text-[12px] font-normal tabular-nums text-gray-400"
                    title="Total de l'étape : imprimé dans la récapitulation, pas dans le détail"
                  >
                    {fmtAmount(step.total)}
                  </td>
                  <td className="pb-0.5 pl-2 pt-5 text-right align-bottom">
                    {empty > 0 && (
                      <button
                        type="button"
                        onClick={() => void prune(step)}
                        title={`Retirer de cette étape les ${empty} lignes restées sans quantité`}
                        className="whitespace-nowrap rounded px-1 py-0.5 text-[11px] font-normal text-gray-400 hover:bg-gray-100 hover:text-accent-600"
                      >
                        <span className="text-[11px] font-normal">
                          − {empty} vide{empty > 1 ? 's' : ''}
                        </span>
                      </button>
                    )}
                  </td>
                </tr>
                {step.positions.map((position, index) => (
                  <PositionRow
                    key={`${position.id}-${applied[position.id] ?? 0}`}
                    position={position}
                    printNumber={numbers.get(position.id) ?? ''}
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
                    onOpenBreakdown={() => setBreakdownId(position.id)}
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
                  <td />
                  <td colSpan={6} className="py-1.5" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
                    <ArticlePicker
                      stepId={step.id}
                      canCreateArticle={Boolean(step.catalog_chapter_id)}
                      busy={busyStep === step.id}
                      onPickArticle={(article) => void add(step, { catalog_article_id: article.id }, true)}
                      onFreeLine={(description, kind) => void add(step, { description, kind }, kind === 'item')}
                      onCreateArticle={(description) => void createAndAdd(step, description)}
                    />
                  </td>
                  <td />
                </tr>
              </tbody>
            )
          })}
          <tfoot>
            <tr className="font-bold">
              <td />
              <td className="border-t border-gray-900 px-1 py-2" />
              <td colSpan={4} className="border-t border-gray-900 px-1 py-2">
                Total brut
              </td>
              <td className="border-t border-gray-900 px-1 py-2 text-right tabular-nums">{fmtAmount(doc.total_net)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {breakdownPosition && (
        <CostBreakdownDialog
          key={breakdownPosition.id}
          position={breakdownPosition}
          actions={actions}
          onSaving={onSaving}
          onPriceApplied={() => setApplied((value) => ({ ...value, [breakdownPosition.id]: (value[breakdownPosition.id] ?? 0) + 1 }))}
          onClose={() => setBreakdownId(null)}
        />
      )}
    </div>
  )
}
