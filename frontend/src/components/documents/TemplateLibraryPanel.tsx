import { useMemo, useState } from 'react'
import { Icon } from '@/components/icons'
import { useBreakdownTemplates, useDeleteBreakdownTemplate, useSaveBreakdownTemplate } from '@/hooks/useBreakdownTemplates'
import { hasLabel, toLinePayload } from '@/lib/breakdown'
import type { LineDraft } from '@/lib/breakdown'
import { toast } from '@/lib/toast'
import type { BreakdownTemplate } from '@/types'

interface TemplateLibraryPanelProps {
  /** Lignes saisies dans le sous-détail ouvert : contenu d'un nouveau modèle, ou mise à jour d'un modèle existant. */
  lines: LineDraft[]
  /** Nom proposé pour un nouveau modèle, quantité et unité de la ligne du devis. */
  defaultName: string
  dimension: number | null
  unit: string | null
  /** Modèle chargé dans ce sous-détail (surligné). */
  loadedId: number | null
  onLoad: (template: BreakdownTemplate) => void
  onCreated: (template: BreakdownTemplate) => void
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Colonne de droite de la fenêtre du sous-détail : la bibliothèque des sous-détails types. Recherche, clic
 * pour charger un ouvrage dans la ligne, création directe d'un ouvrage avec les lignes saisies, mise à jour
 * d'un ouvrage existant avec ces lignes, suppression.
 */
export default function TemplateLibraryPanel({ lines, defaultName, dimension, unit, loadedId, onLoad, onCreated }: TemplateLibraryPanelProps) {
  const templates = useBreakdownTemplates()
  const save = useSaveBreakdownTemplate()
  const remove = useDeleteBreakdownTemplate()
  const [term, setTerm] = useState('')
  const [name, setName] = useState(defaultName)
  // Groupe (corps de métier) du nouvel ouvrage : un groupe existant, ou « Autre » saisi à la main.
  const [groupChoice, setGroupChoice] = useState('')
  const [customGroup, setCustomGroup] = useState('')
  const group = groupChoice === '__other' ? customGroup : groupChoice
  const usable = lines.filter(hasLabel)
  const allGroups = useMemo(
    () => [...new Set((templates.data ?? []).map((item) => item.group).filter((item): item is string => Boolean(item)))].sort((a, b) => a.localeCompare(b, 'fr')),
    [templates.data],
  )

  const groups = useMemo(() => {
    const words = normalize(term).split(/\s+/).filter(Boolean)
    const list = (templates.data ?? []).filter((item) => {
      const haystack = normalize(`${item.group ?? ''} ${item.name}`)
      return words.every((word) => haystack.includes(word))
    })
    const map = new Map<string, BreakdownTemplate[]>()
    for (const item of list) {
      const key = item.group ?? 'Sans groupe'
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return [...map.entries()]
  }, [templates.data, term])

  const linesPayload = () => usable.map((line) => ({ ...toLinePayload(line), id: undefined }))

  function create() {
    if (!name.trim() || usable.length === 0 || save.isPending) {
      return
    }
    save.mutate(
      {
        id: null,
        payload: { name: name.trim(), group: group.trim() || null, dimension, dimension_unit: unit, price_per_dimension: true, lines: linesPayload() },
      },
      {
        onSuccess: (template) => {
          toast(`Sous-détail type « ${template.name} » créé avec ${usable.length} ligne${usable.length > 1 ? 's' : ''}.`, 'success')
          onCreated(template)
        },
        onError: () => toast("Le sous-détail type n'a pas pu être créé.", 'error'),
      },
    )
  }

  function replaceLines(template: BreakdownTemplate) {
    if (!window.confirm(`Remplacer les lignes du sous-détail type « ${template.name} » par les ${usable.length} lignes saisies ici ?`)) {
      return
    }
    save.mutate(
      { id: template.id, payload: { dimension, dimension_unit: unit, price_per_dimension: true, lines: linesPayload() } },
      {
        onSuccess: () => toast(`« ${template.name} » mis à jour.`, 'success'),
        onError: () => toast("Le sous-détail type n'a pas pu être mis à jour.", 'error'),
      },
    )
  }

  function destroy(template: BreakdownTemplate) {
    if (!window.confirm(`Supprimer le sous-détail type « ${template.name} » de la bibliothèque ?`)) {
      return
    }
    remove.mutate(template.id, {
      onSuccess: () => toast(`« ${template.name} » supprimé.`, 'success'),
      onError: () => toast('Suppression impossible.', 'error'),
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Sous-détails types</div>
      <p className="mb-2 text-[12px] text-gray-500">Un clic charge l'ouvrage dans la ligne.</p>

      <div className="relative mb-2">
        <Icon name="search" className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              setTerm('')
            }
          }}
          placeholder="Chercher un ouvrage (carrelage, crépi…)"
          className="h-8 w-full rounded-md border border-gray-300 pl-7 pr-2 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-gray-200">
        {groups.map(([group, items]) => (
          <div key={group}>
            <div className="sticky top-0 bg-gray-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">{group}</div>
            {items.map((template) => {
              const current = template.id === loadedId
              return (
                <div
                  key={template.id}
                  className={`group flex items-center gap-1 border-b border-gray-100 pr-1 ${current ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                >
                  <button
                    type="button"
                    onClick={() => onLoad(template)}
                    title={`Charger « ${template.name} » dans la ligne${template.note ? `\n${template.note}` : ''}`}
                    className="flex min-w-0 flex-1 items-baseline gap-2 px-2 py-1.5 text-left text-[13px]"
                  >
                    <span className={`min-w-0 flex-1 truncate ${current ? 'font-medium text-primary-800' : 'text-gray-800'}`}>{template.name}</span>
                    <span className="shrink-0 text-[11px] text-gray-400">
                      {template.dimension_unit ?? ''} · {template.lines_count ?? template.lines?.length ?? 0} l.
                    </span>
                  </button>
                  {usable.length > 0 && (
                    <button
                      type="button"
                      onClick={() => replaceLines(template)}
                      disabled={save.isPending}
                      title="Remplacer les lignes de cet ouvrage par celles saisies ici"
                      className="rounded p-1 text-gray-300 opacity-0 transition hover:bg-primary-100 hover:text-primary-700 group-hover:opacity-100"
                    >
                      <Icon name="save" className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => destroy(template)}
                    disabled={remove.isPending}
                    title="Supprimer cet ouvrage de la bibliothèque"
                    className="rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        ))}
        {groups.length === 0 && <p className="px-2 py-2 text-[12px] text-gray-400">{templates.isLoading ? 'Chargement…' : 'Aucun ouvrage.'}</p>}
      </div>

      <div className="mt-2 rounded-md border border-dashed border-primary-300 bg-primary-50/50 p-2">
        <div className="mb-1 text-[12px] font-medium text-primary-800">Nouvel ouvrage avec les lignes saisies</div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <label htmlFor="template-group" className="w-[52px] shrink-0 text-[12px] text-gray-600">
            Groupe
          </label>
          <select
            id="template-group"
            value={groupChoice}
            onChange={(event) => setGroupChoice(event.target.value)}
            title="Corps de métier sous lequel l'ouvrage sera rangé"
            className="h-8 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">— sans groupe —</option>
            {allGroups.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value="__other">Autre (saisir)…</option>
          </select>
        </div>
        {groupChoice === '__other' && (
          <input
            autoFocus
            value={customGroup}
            onChange={(event) => setCustomGroup(event.target.value)}
            maxLength={80}
            placeholder="Nom du nouveau groupe"
            className="mb-1.5 h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        )}
        <div className="flex gap-1.5">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                create()
              }
            }}
            maxLength={255}
            placeholder="Nom de l'ouvrage"
            aria-label="Nom de l'ouvrage"
            className="h-8 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 text-[13px] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <button
            type="button"
            onClick={create}
            disabled={!name.trim() || usable.length === 0 || save.isPending}
            title={usable.length === 0 ? "Saisissez d'abord des lignes dans le sous-détail" : `Créer l'ouvrage avec les ${usable.length} lignes saisies`}
            className="flex h-8 shrink-0 items-center gap-1 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Créer
          </button>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          {usable.length > 0 ? `${usable.length} ligne${usable.length > 1 ? 's' : ''}, pour ${dimension ?? 1} ${unit || 'unité'}.` : 'Ajoutez des lignes à gauche, puis donnez un nom.'}
        </p>
      </div>
    </div>
  )
}
