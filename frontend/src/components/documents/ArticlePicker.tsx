import { useMemo, useState } from 'react'
import { searchIndex } from '@/lib/searchIndex'
import { useArticlePicker } from '@/hooks/useDocuments'
import type { PickerArticle } from '@/hooks/useDocuments'
import { Icon } from '@/components/icons'

interface ArticlePickerProps {
  stepId: number
  /** L'étape vient d'un chapitre du catalogue : on peut y créer un article à la volée. */
  canCreateArticle: boolean
  onPickArticle: (article: PickerArticle) => void
  onFreeLine: (description: string) => void
  onCreateArticle: (description: string) => void
  busy?: boolean
}

type Choice =
  | { type: 'article'; article: PickerArticle; sublabel: string }
  | { type: 'free' }
  | { type: 'create' }

/**
 * Champ d'ajout de position d'une étape : on tape, les articles du catalogue apparaissent
 * instantanément, Entrée insère. Sans résultat : ligne libre, ou création de l'article à la volée.
 */
export default function ArticlePicker({ stepId, canCreateArticle, onPickArticle, onFreeLine, onCreateArticle, busy = false }: ArticlePickerProps) {
  const picker = useArticlePicker()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const text = term.trim()

  const choices = useMemo<Choice[]>(() => {
    if (text.length < 2) {
      return []
    }
    const found = picker.data
      ? (searchIndex(picker.data.index, text, 8)[0]?.items ?? []).flatMap((item) => {
          const article = picker.data.articles.get(item.id)
          return article ? [{ type: 'article' as const, article, sublabel: item.sublabel }] : []
        })
      : []
    return [...found, { type: 'free' }, ...(canCreateArticle ? [{ type: 'create' as const }] : [])]
  }, [picker.data, text, canCreateArticle])

  function choose(choice: Choice | undefined) {
    if (!choice || busy) {
      return
    }
    if (choice.type === 'article') {
      onPickArticle(choice.article)
    } else if (choice.type === 'free') {
      onFreeLine(text)
    } else {
      onCreateArticle(text)
    }
    setTerm('')
    setActive(0)
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((value) => Math.min(choices.length - 1, value + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((value) => Math.max(0, value - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(choices[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Icon name="plus" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        data-picker={stepId}
        value={term}
        onChange={(event) => {
          setTerm(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        disabled={busy}
        placeholder="Ajouter une position : tapez un article, un code ou un texte libre…"
        className="h-8 w-full rounded-md border border-dashed border-gray-300 bg-white pl-8 pr-3 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-solid focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      />

      {open && choices.length > 0 && (
        <div className="absolute left-0 top-9 z-30 w-[720px] max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
          {choices.map((choice, index) => (
            <button
              key={choice.type === 'article' ? choice.article.id : choice.type}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(choice)}
              className={`flex w-full items-baseline gap-3 px-3 py-1.5 text-left text-[13px] ${
                index === active ? 'bg-primary-50 text-primary-800' : ''
              } ${choice.type !== 'article' ? 'border-t border-gray-100 text-gray-600' : ''}`}
            >
              {choice.type === 'article' && (
                <>
                  <span className="min-w-0 flex-1 truncate">{choice.article.description}</span>
                  <span className="shrink-0 text-[11px] text-gray-400">{choice.sublabel}</span>
                </>
              )}
              {choice.type === 'free' && (
                <span>
                  Ajouter en ligne libre : <span className="font-medium text-gray-800">« {text} »</span>
                </span>
              )}
              {choice.type === 'create' && (
                <span>
                  Créer l'article <span className="font-medium text-gray-800">« {text} »</span> dans le catalogue et l'ajouter
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
