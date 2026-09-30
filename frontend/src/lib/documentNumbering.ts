import type { DocumentStep } from '@/types'

/**
 * Numérotation imprimée des positions, identique à celle du PDF (DocumentPrint::steps côté API) :
 * étape 5 → positions 5.1, 5.2 ; un sous-titre 6.1 ouvre un sous-groupe 6.1.1, 6.1.2 ; un texte n'a pas de numéro.
 * Renvoie le numéro de chaque position par identifiant.
 */
export function printNumbers(steps: DocumentStep[]): Map<number, string> {
  const numbers = new Map<number, string>()

  steps.forEach((step, stepIndex) => {
    const stepNumber = String(stepIndex + 1)
    let item = 0
    let group: string | null = null
    let sub = 0

    for (const position of step.positions) {
      if (position.kind === 'text') {
        numbers.set(position.id, '')
      } else if (position.kind === 'title') {
        item += 1
        group = `${stepNumber}.${item}`
        sub = 0
        numbers.set(position.id, group)
      } else if (group) {
        sub += 1
        numbers.set(position.id, `${group}.${sub}`)
      } else {
        item += 1
        numbers.set(position.id, `${stepNumber}.${item}`)
      }
    }
  })

  return numbers
}
