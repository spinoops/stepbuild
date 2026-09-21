import type { SearchGroup } from '@/types'

/** Réponse de GET /api/search/index : [id, libellé, sous-libellé, utilisations, texte en plus]. */
export interface SearchIndexResponse {
  groups: { key: string; title: string; path: string; items: [number, string, string, number, string][] }[]
}

interface IndexedItem {
  id: number
  label: string
  sublabel: string
  usage: number
  text: string
  labelText: string
  tokens: string[]
}

export interface SearchIndex {
  groups: { key: string; title: string; path: string; items: IndexedItem[] }[]
  size: number
  /** Tous les mots distincts de l'index : la tolérance aux fautes s'y compare une seule fois. */
  vocabulary: string[]
}

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Prépare l'index une fois pour toutes (texte normalisé et mots de chaque élément). */
export function buildIndex(response: SearchIndexResponse): SearchIndex {
  let size = 0
  const vocabulary = new Set<string>()
  const groups = response.groups.map((group) => ({
    key: group.key,
    title: group.title,
    path: group.path,
    items: group.items.map(([id, label, sublabel, usage, extra]) => {
      const text = normalize(`${label} ${sublabel} ${extra}`)
      size += 1
      const tokens = text.split(/[^a-z0-9]+/).filter(Boolean)
      tokens.forEach((token) => vocabulary.add(token))
      return { id, label, sublabel, usage, text, labelText: normalize(label), tokens }
    }),
  }))
  return { groups, size, vocabulary: [...vocabulary] }
}

/** Distance d'édition (Levenshtein) bornée : renvoie max + 1 dès que la borne est dépassée. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) {
    return max + 1
  }
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    let best = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      current.push(value)
      best = Math.min(best, value)
    }
    if (best > max) {
      return max + 1
    }
    previous = current
  }
  return previous[b.length]
}

/** Mots du vocabulaire proches du mot saisi : 1 faute pour 4-5 lettres, 2 dès 6 lettres (« bagete » → « baguette »). */
function fuzzyTokens(word: string, vocabulary: string[]): Set<string> {
  const max = word.length >= 6 ? 2 : 1
  const matches = new Set<string>()
  for (const token of vocabulary) {
    // Compare au mot entier et à son début (l'utilisateur est peut-être en train de taper).
    if (editDistance(word, token.slice(0, word.length), max) <= max || editDistance(word, token, max) <= max) {
      matches.add(token)
    }
  }
  return matches
}

function score(item: IndexedItem, words: string[], fuzzy: Map<string, Set<string>> | null): number {
  let total = 0
  for (const word of words) {
    if (item.text.includes(word)) {
      total += item.labelText.startsWith(word) ? 5 : item.tokens.some((token) => token.startsWith(word)) ? 3 : 1
    } else if (fuzzy?.get(word) && item.tokens.some((token) => fuzzy.get(word)!.has(token))) {
      total += 0.5
    } else {
      return 0
    }
  }
  return total
}

/**
 * Recherche en mémoire : tous les mots doivent correspondre (n'importe quel ordre),
 * sans accents ni casse ; les débuts de mots et les éléments les plus utilisés remontent.
 * Si rien (ou presque) n'est trouvé, une seconde passe tolère les fautes de frappe.
 */
export function searchIndex(index: SearchIndex, term: string, limit = 8): SearchGroup[] {
  const words = normalize(term).split(/\s+/).filter(Boolean)
  if (words.join('').length < 2) {
    return []
  }

  const run = (fuzzy: Map<string, Set<string>> | null) =>
    index.groups
      .map((group) => ({
        key: group.key,
        title: group.title,
        path: group.path,
        items: group.items
          .map((item) => ({ item, value: score(item, words, fuzzy) }))
          .filter((entry) => entry.value > 0)
          .sort((a, b) => b.value - a.value || b.item.usage - a.item.usage || a.item.label.localeCompare(b.item.label))
          .slice(0, limit)
          .map(({ item }) => ({ id: item.id, label: item.label, sublabel: item.sublabel })),
      }))
      .filter((group) => group.items.length > 0)

  const exact = run(null)
  const found = exact.reduce((sum, group) => sum + group.items.length, 0)
  if (found >= 3) {
    return exact
  }

  // Seconde passe tolérante aux fautes, pour les mots d'au moins 4 lettres.
  const fuzzy = new Map<string, Set<string>>()
  for (const word of words) {
    if (word.length >= 4) {
      fuzzy.set(word, fuzzyTokens(word, index.vocabulary ?? []))
    }
  }
  return run(fuzzy)
}

/** Recherche + durée mesurée (affichée sous les résultats, pour vérifier l'objectif < 100 ms). */
export function timedSearch(index: SearchIndex, term: string): { groups: SearchGroup[]; tookMs: number } {
  const started = performance.now()
  const groups = searchIndex(index, term)
  return { groups, tookMs: performance.now() - started }
}
