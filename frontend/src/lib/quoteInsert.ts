import type { DocumentActions, PickerArticle } from '@/hooks/useDocuments'
import type { CatalogChapter, DocumentDetail, DocumentStep } from '@/types'

/** Endroit visé dans le devis : une étape, et une ligne (au-dessus / en dessous) ou la fin de l'étape. */
export interface InsertTarget {
  stepId: number
  positionId: number | null
  place: 'above' | 'below'
}

export interface InsertResult {
  step: DocumentStep
  positionId: number | null
  /** L'étape n'existait pas dans le devis : elle vient d'être créée (titre seul). */
  stepCreated: boolean
}

/**
 * Étape du devis qui accueille un article du catalogue : celle créée depuis son chapitre,
 * sinon celle créée depuis le chapitre parent. Null si l'étape n'est pas encore dans le devis.
 */
export function findStepForArticle(doc: DocumentDetail, chapters: CatalogChapter[], article: PickerArticle): DocumentStep | null {
  const steps = doc.steps ?? []
  const parentId = chapters.find((chapter) => chapter.id === article.chapterId)?.parent_id ?? null
  for (const chapterId of [article.chapterId, parentId]) {
    const step = chapterId === null ? undefined : steps.find((item) => item.catalog_chapter_id === chapterId)
    if (step) {
      return step
    }
  }
  return null
}

/** Étape du devis créée depuis ce chapitre, s'il y en a une. */
export function findStepForChapter(doc: DocumentDetail, chapterId: number): DocumentStep | null {
  return (doc.steps ?? []).find((step) => step.catalog_chapter_id === chapterId) ?? null
}

/**
 * Ajoute au devis l'étape d'un chapitre (titre seul, sans ses articles), ou renvoie celle qui existe déjà.
 */
export async function ensureStep(doc: DocumentDetail, actions: DocumentActions, chapterId: number): Promise<{ step: DocumentStep; created: boolean }> {
  const existing = findStepForChapter(doc, chapterId)
  if (existing) {
    return { step: existing, created: false }
  }
  const updated = await actions.addStep({ catalog_chapter_id: chapterId, with_articles: false })
  const step = [...(updated.steps ?? [])].reverse().find((item) => item.catalog_chapter_id === chapterId)
  if (!step) {
    throw new Error("L'étape n'a pas été créée.")
  }
  return { step, created: true }
}

/**
 * Insère un article du catalogue dans le devis.
 * Avec une cible (dépôt sur une ligne) : à cet endroit. Sans cible (clic ou dépôt hors ligne) :
 * dans l'étape de son chapitre, créée au besoin (titre seul) à la fin du devis.
 */
export async function insertArticle(
  doc: DocumentDetail,
  actions: DocumentActions,
  chapters: CatalogChapter[],
  article: PickerArticle,
  target?: InsertTarget | null,
): Promise<InsertResult> {
  let step = target ? ((doc.steps ?? []).find((item) => item.id === target.stepId) ?? null) : findStepForArticle(doc, chapters, article)
  let stepCreated = false
  if (!step) {
    const ensured = await ensureStep(doc, actions, article.chapterId)
    step = ensured.step
    stepCreated = ensured.created
  }

  // Position d'insertion : après la ligne précédente ; en tête d'étape, on ajoute puis on réordonne.
  let afterId: number | null = null
  let atTop = false
  if (target && target.positionId !== null) {
    const ids = step.positions.map((position) => position.id)
    const index = ids.indexOf(target.positionId) + (target.place === 'below' ? 1 : 0)
    if (index <= 0) {
      atTop = ids.length > 0
    } else {
      afterId = ids[index - 1]
    }
  }

  const positionId = await actions.addPosition({
    document_step_id: step.id,
    catalog_article_id: article.id,
    ...(afterId !== null ? { after_id: afterId } : {}),
  })
  if (atTop && positionId !== null) {
    await actions.reorderPositions(step.id, [positionId, ...step.positions.map((position) => position.id)])
  }
  return { step, positionId, stepCreated }
}

/** Fait défiler la feuille jusqu'à la ligne insérée et place le curseur sur sa quantité. */
export function focusInsertedPosition(stepId: number, positionId: number | null): void {
  window.setTimeout(() => {
    const field = positionId !== null ? window.document.querySelector<HTMLInputElement>(`[data-qty="${positionId}"]`) : null
    if (field) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field.focus()
      field.select()
    } else {
      window.document.getElementById(`step-${stepId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 80)
}
