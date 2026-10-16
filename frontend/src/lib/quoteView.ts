/**
 * Options d'affichage du devis, valables aussi pour l'aperçu et le PDF : sous-détails de prix affichés
 * en rouge sous chaque ligne, prix masqués (devis descriptif). Mémorisées dans le navigateur.
 */
export interface QuoteViewOptions {
  showBreakdown: boolean
  hidePrices: boolean
}

const KEY = 'stepbuild.quote.view'

export const DEFAULT_QUOTE_VIEW: QuoteViewOptions = { showBreakdown: false, hidePrices: false }

export function loadQuoteView(): QuoteViewOptions {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<QuoteViewOptions>) : {}
    return { showBreakdown: Boolean(parsed.showBreakdown), hidePrices: Boolean(parsed.hidePrices) }
  } catch {
    return DEFAULT_QUOTE_VIEW
  }
}

export function saveQuoteView(options: QuoteViewOptions): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(options))
  } catch {
    // Stockage indisponible (navigation privée) : l'option vaut pour la session seulement.
  }
}

/** Paramètres du PDF correspondant aux options (`?breakdown=1&prices=0`). */
export function pdfParams(options: QuoteViewOptions): Record<string, number> {
  return { ...(options.showBreakdown ? { breakdown: 1 } : {}), ...(options.hidePrices ? { prices: 0 } : {}) }
}
