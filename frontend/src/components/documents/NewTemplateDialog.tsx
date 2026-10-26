import { useMemo, useState } from 'react'
import { BB_FIELD } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import Modal from '@/components/ui/Modal'
import { useBreakdownTemplates, useSaveBreakdownTemplate } from '@/hooks/useBreakdownTemplates'
import { hasLabel, toLinePayload } from '@/lib/breakdown'
import type { LineDraft } from '@/lib/breakdown'
import { toast } from '@/lib/toast'
import type { BreakdownTemplate } from '@/types'

interface NewTemplateDialogProps {
  open: boolean
  onClose: () => void
  /** Nom proposé (description de la position) et unité de la ligne. */
  defaultName: string
  defaultUnit: string
  defaultDimension: number | null
  /** Lignes saisies dans le sous-détail : proposées comme contenu du nouveau modèle. */
  lines: LineDraft[]
  onCreated?: (template: BreakdownTemplate) => void
}

/**
 * Création rapide d'un sous-détail type depuis la fenêtre du sous-détail (bouton « + ») : nom de l'ouvrage,
 * groupe, unité, et les lignes déjà saisies si on le souhaite. Un modèle créé vide s'ouvre ensuite dans la
 * page Sous-détails types pour y mettre ses lignes.
 */
export default function NewTemplateDialog({ open, onClose, defaultName, defaultUnit, defaultDimension, lines, onCreated }: NewTemplateDialogProps) {
  const templates = useBreakdownTemplates(open)
  const save = useSaveBreakdownTemplate()
  const [name, setName] = useState(defaultName)
  const [group, setGroup] = useState('')
  const [unit, setUnit] = useState(defaultUnit)
  const [withLines, setWithLines] = useState(true)
  const [created, setCreated] = useState<BreakdownTemplate | null>(null)
  const usable = lines.filter(hasLabel)
  const groups = useMemo(() => [...new Set((templates.data ?? []).map((item) => item.group).filter((item): item is string => Boolean(item)))].sort(), [templates.data])
  const label = 'flex flex-col gap-1 text-[12px] font-medium text-gray-600'

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || save.isPending) {
      return
    }
    const copy = withLines && usable.length > 0
    save.mutate(
      {
        id: null,
        payload: {
          name: name.trim(),
          group: group.trim() || null,
          dimension: copy ? defaultDimension : null,
          dimension_unit: unit.trim() || null,
          price_per_dimension: copy,
          lines: copy ? usable.map((line) => ({ ...toLinePayload(line), id: undefined })) : [],
        },
      },
      {
        onSuccess: (template) => {
          toast(`Sous-détail type « ${template.name} » créé.`, 'success')
          onCreated?.(template)
          setCreated(template)
        },
        onError: () => toast("Le sous-détail type n'a pas pu être créé.", 'error'),
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose}>
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
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Sous-détails types</div>
            <h3 className="text-[16px] font-semibold text-gray-900">Nouveau sous-détail type</h3>
          </div>
          <button type="button" onClick={onClose} title="Fermer" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {created ? (
          <div className="mt-4 space-y-3 text-[13px] text-gray-700">
            <p>
              <b>{created.name}</b> est dans la bibliothèque{created.lines?.length ? ` avec ${created.lines.length} ligne${created.lines.length > 1 ? 's' : ''}` : ', sans ligne pour l’instant'}.
              {!created.lines?.length && ' Complétez ses lignes dans la page Sous-détails types.'}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
                Fermer
              </button>
              <a
                href={`/sous-details-types?id=${created.id}`}
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                className="flex h-8 items-center rounded-md bg-accent-600 px-4 text-[13px] font-medium text-white hover:bg-accent-700"
              >
                {created.lines?.length ? 'Ouvrir dans Sous-détails types' : 'Compléter les lignes'}
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              <label className={label}>
                Ouvrage
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={255} placeholder="Pose carrelage + fourniture" className={`${BB_FIELD} w-full font-normal`} />
              </label>
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <label className={label}>
                  Groupe (corps de métier)
                  <input value={group} onChange={(e) => setGroup(e.target.value)} maxLength={80} list="new-template-groups" placeholder="Carrelage" className={`${BB_FIELD} w-full font-normal`} />
                  <datalist id="new-template-groups">
                    {groups.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <label className={label}>
                  Unité (DIM)
                  <input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} placeholder="m2" className={`${BB_FIELD} w-full font-normal`} />
                </label>
              </div>
              {usable.length > 0 && (
                <label className="flex items-center gap-2 text-[13px] text-gray-700">
                  <input type="checkbox" checked={withLines} onChange={(e) => setWithLines(e.target.checked)} className="h-4 w-4 accent-primary-600" />
                  Reprendre les {usable.length} ligne{usable.length > 1 ? 's' : ''} de ce sous-détail
                  {defaultDimension !== null && <span className="text-gray-400">(pour {defaultDimension} {defaultUnit || 'unité'})</span>}
                </label>
              )}
              <p className="text-[12px] text-gray-400">
                {usable.length > 0 && withLines
                  ? 'Les lignes rattachées à un élément de coûts garderont son prix à jour.'
                  : 'Le modèle est créé vide : vous mettrez ses lignes dans la page Sous-détails types.'}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
                Annuler
              </button>
              <button type="submit" disabled={!name.trim() || save.isPending} className="h-8 rounded-md bg-accent-600 px-4 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40">
                Créer
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
