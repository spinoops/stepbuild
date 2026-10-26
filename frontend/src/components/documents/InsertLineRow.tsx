import { useState } from 'react'
import { Icon } from '@/components/icons'

export type InsertKind = 'chapter' | 'title' | 'text'

/**
 * Petit « + » posé sur le bord supérieur d'une ligne de la feuille (visible au survol de la ligne) :
 * ouvre la ligne d'insertion à cet endroit. À placer dans une cellule `relative`.
 */
export function InsertAboveButton({ onClick, title = 'Insérer ici un titre de chapitre, un sous-titre ou un texte' }: { onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="absolute -top-2.5 left-0.5 z-[1] flex h-5 w-5 items-center justify-center rounded-full border border-primary-300 bg-white text-primary-600 opacity-0 shadow-sm transition hover:bg-primary-600 hover:text-white focus:opacity-100 group-hover:opacity-100"
    >
      <Icon name="plus" className="h-3 w-3" />
    </button>
  )
}

const KINDS: { kind: InsertKind; label: string; placeholder: string; hint: string }[] = [
  {
    kind: 'chapter',
    label: 'Titre de chapitre',
    placeholder: 'Titre du chapitre, ex. Démolition cuisine',
    hint: 'Nouveau chapitre numéroté, comme une étape : les lignes en dessous passent sous ce titre.',
  },
  { kind: 'title', label: 'Sous-titre', placeholder: 'Sous-titre, ex. Murs', hint: 'Sous-titre en gras dans le chapitre (6.1), qui ouvre un sous-groupe.' },
  { kind: 'text', label: 'Texte', placeholder: 'Texte libre, sans prix ni numéro', hint: 'Texte en italique, sans prix ni numéro.' },
]

interface InsertLineRowProps {
  /** Colonnes entre la poignée et les outils de droite (6, ou 7 avec la colonne « Qté devis »). */
  span: number
  busy: boolean
  onSubmit: (kind: InsertKind, text: string) => void
  onCancel: () => void
}

/**
 * Ligne d'insertion ouverte par le « + » entre deux lignes de la feuille : titre de chapitre (par défaut),
 * sous-titre ou texte, saisi au clavier. Entrée insère, Échap annule.
 */
export default function InsertLineRow({ span, busy, onSubmit, onCancel }: InsertLineRowProps) {
  const [kind, setKind] = useState<InsertKind>('chapter')
  const [text, setText] = useState('')
  const current = KINDS.find((item) => item.kind === kind) ?? KINDS[0]

  function submit() {
    if (text.trim() && !busy) {
      onSubmit(kind, text.trim())
    }
  }

  return (
    <tr>
      <td />
      <td colSpan={span} className="py-1.5" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <div className="rounded-md border border-dashed border-primary-400 bg-primary-50/60 p-2">
          <div className="mb-1.5 flex items-center gap-1 text-[12px]">
            {KINDS.map((item) => (
              <button
                key={item.kind}
                type="button"
                onMouseDown={(event) => event.preventDefault()} // le curseur reste dans le champ
                onClick={() => setKind(item.kind)}
                title={item.hint}
                className={`h-6 shrink-0 whitespace-nowrap rounded px-2 transition ${kind === item.kind ? 'bg-primary-600 font-medium text-white' : 'text-gray-600 hover:bg-white'}`}
              >
                {item.label}
              </button>
            ))}
            <span className="ml-2 min-w-0 truncate text-gray-500" title={current.hint}>{current.hint}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={text}
              disabled={busy}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  submit()
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  onCancel()
                }
              }}
              maxLength={kind === 'chapter' ? 255 : 2000}
              placeholder={current.placeholder}
              aria-label={current.label}
              className={`h-8 min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 text-[14px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 ${
                kind === 'chapter' || kind === 'title' ? 'font-bold' : 'italic'
              }`}
            />
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim() || busy}
              className="h-8 shrink-0 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40"
            >
              Insérer
            </button>
            <button type="button" onClick={onCancel} title="Annuler (Échap)" className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-white hover:text-gray-700">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </td>
      <td />
    </tr>
  )
}
