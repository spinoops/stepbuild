import { useState } from 'react'
import { BB_FIELD } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import UnitSelect from '@/components/shared/UnitSelect'
import Modal from '@/components/ui/Modal'
import { useCreateArticleOnTheFly } from '@/hooks/useDocuments'
import { PRICE_PATTERN, nullable, toNumber } from '@/lib/crud'
import { toast } from '@/lib/toast'
import type { CatalogArticle, CatalogChapter } from '@/types'

interface ArticleCreateDialogProps {
  chapter: CatalogChapter
  onClose: () => void
  onCreated?: (article: CatalogArticle) => void
}

/**
 * Fenêtre d'ajout d'un article dans un chapitre du catalogue (bouton « + » du panneau du devis) :
 * description, code, unité, prix d'achat et prix de vente. L'article rejoint le catalogue ; il se glisse
 * ensuite dans le devis comme les autres.
 */
export default function ArticleCreateDialog({ chapter, onClose, onCreated }: ArticleCreateDialogProps) {
  const create = useCreateArticleOnTheFly()
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [unit, setUnit] = useState('')
  const [purchase, setPurchase] = useState('')
  const [sale, setSale] = useState('')
  const valid = description.trim() !== '' && PRICE_PATTERN.test(purchase) && PRICE_PATTERN.test(sale)
  const label = 'flex flex-col gap-1 text-[12px] font-medium text-gray-600'

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!valid || create.isPending) {
      return
    }
    create.mutate(
      {
        catalog_chapter_id: chapter.id,
        description: description.trim(),
        code: nullable(code),
        unit: nullable(unit),
        purchase_price: toNumber(purchase),
        sale_price: toNumber(sale),
      },
      {
        onSuccess: (article) => {
          toast(`Article ajouté au chapitre ${chapter.code} - ${chapter.label}.`, 'success')
          onCreated?.(article)
          onClose()
        },
        onError: () => toast("L'article n'a pas pu être créé.", 'error'),
      },
    )
  }

  return (
    <Modal open onClose={onClose}>
      <form
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            onClose()
          }
        }}
        className="bb"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Catalogue de prix</div>
            <h3 className="text-[16px] font-semibold text-gray-900">Nouvel article</h3>
            <div className="truncate text-[12px] text-gray-500">
              Chapitre {chapter.code} - {chapter.label}
            </div>
          </div>
          <button type="button" onClick={onClose} title="Fermer" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className={label}>
            Description
            <textarea autoFocus value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={500} placeholder="Fourniture et pose…" className={`${BB_FIELD} h-auto w-full py-1.5 text-[13px] font-normal`} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              Code
              <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} placeholder="ex. 025" className={`${BB_FIELD} w-full font-normal`} />
            </label>
            <label className={label}>
              Unité
              <UnitSelect value={unit} onChange={setUnit} className={`${BB_FIELD} w-full font-normal`} />
            </label>
            <label className={label}>
              Prix d'achat
              <input value={purchase} onChange={(e) => setPurchase(e.target.value)} inputMode="decimal" className={`${BB_FIELD} w-full text-right font-normal ${PRICE_PATTERN.test(purchase) ? '' : 'border-red-400'}`} />
            </label>
            <label className={label}>
              Prix de vente
              <input value={sale} onChange={(e) => setSale(e.target.value)} inputMode="decimal" className={`${BB_FIELD} w-full text-right font-normal ${PRICE_PATTERN.test(sale) ? '' : 'border-red-400'}`} />
            </label>
          </div>
          <p className="text-[12px] text-gray-400">L'article est ajouté au catalogue ; glissez-le ensuite sur le devis.</p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          <button type="submit" disabled={!valid || create.isPending} className="h-8 rounded-md bg-accent-600 px-4 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40">
            Créer l'article
          </button>
        </div>
      </form>
    </Modal>
  )
}
