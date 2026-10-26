import type { DocumentActions, PickerArticle } from '@/hooks/useDocuments'
import type { CatalogItem } from '@/lib/catalogDrag'
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

/**
 * L'étape peut recevoir cet article : elle vient de son chapitre ou du chapitre parent. Un article ne
 * s'ajoute jamais dans l'étape d'un autre corps de métier (TERRASSEMENT ne va pas dans SOUS-TRAITANTS) ;
 * une fois dans le devis, la position peut ensuite être déplacée librement. Un chapitre libre (titre saisi à la
 * main, sans chapitre du catalogue) accepte tout article qu'on y dépose : c'est l'utilisateur qui l'a créé.
 */
export function stepAcceptsArticle(step: DocumentStep, chapters: CatalogChapter[], article: PickerArticle): boolean {
  if (step.catalog_chapter_id === null) {
    return true
  }
  const parentId = chapters.find((chapter) => chapter.id === article.chapterId)?.parent_id ?? null
  return step.catalog_chapter_id === article.chapterId || step.catalog_chapter_id === parentId
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
 * Avec une cible (dépôt sur une ligne de l'étape de son chapitre) : à cet endroit. Sans cible (dépôt
 * ailleurs) : dans l'étape de son chapitre, créée au besoin (titre seul) à la fin du devis.
 * L'appelant vérifie la cible avec `stepAcceptsArticle()`.
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

  // Position d'insertion : après la ligne précédente, ou en tête d'étape (after_id = 0) ; sans cible, à la fin.
  let afterId: number | null = null
  if (target && target.positionId !== null) {
    const ids = step.positions.map((position) => position.id)
    const index = ids.indexOf(target.positionId) + (target.place === 'below' ? 1 : 0)
    afterId = index <= 0 ? 0 : ids[index - 1]
  }

  const positionId = await actions.addPosition({
    document_step_id: step.id,
    catalog_article_id: article.id,
    ...(afterId !== null ? { after_id: afterId } : {}),
  })
  return { step, positionId, stepCreated }
}

export interface InsertManyResult {
  /** Étapes créées au passage (titre seul). */
  createdSteps: string[]
  /** Articles déposés dans une autre étape que la leur : partis dans l'étape de leur chapitre. */
  redirected: number
  last: InsertResult | null
}

/**
 * Insère plusieurs éléments du catalogue (sélection Ctrl / Maj), dans l'ordre. Les articles acceptés par la
 * cible s'y suivent ; les autres rejoignent l'étape de leur chapitre, créée au besoin ; un chapitre ajoute
 * son étape. Le document est relu dans le cache entre deux ajouts (`actions.current()`).
 */
export async function insertMany(
  actions: DocumentActions,
  chapters: CatalogChapter[],
  items: CatalogItem[],
  target: InsertTarget | null,
): Promise<InsertManyResult> {
  const result: InsertManyResult = { createdSteps: [], redirected: 0, last: null }
  let cursor = target
  for (const item of items) {
    const doc = actions.current()
    if (!doc) {
      break
    }
    if (item.kind === 'chapter') {
      const { step, created } = await ensureStep(doc, actions, item.chapter.id)
      if (created) {
        result.createdSteps.push(step.label)
      }
      result.last = { step, positionId: null, stepCreated: created }
      continue
    }
    const targetStep = cursor ? (doc.steps ?? []).find((step) => step.id === cursor?.stepId) : undefined
    const placed = cursor !== null && targetStep !== undefined && stepAcceptsArticle(targetStep, chapters, item.article)
    const inserted = await insertArticle(doc, actions, chapters, item.article, placed ? cursor : null)
    if (placed && inserted.positionId !== null) {
      cursor = { stepId: inserted.step.id, positionId: inserted.positionId, place: 'below' } // le suivant se met dessous
    } else if (target) {
      result.redirected += 1
    }
    if (inserted.stepCreated) {
      result.createdSteps.push(inserted.step.label)
    }
    result.last = inserted
  }
  return result
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
