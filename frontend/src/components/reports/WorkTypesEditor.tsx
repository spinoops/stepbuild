import { useState } from 'react'
import { BbInput, BbSelect, SectionTitle } from '@/components/baubit/Form'
import { Icon } from '@/components/icons'
import { useWorkTypeActions, useWorkTypes } from '@/hooks/useDailyReports'
import { toast } from '@/lib/toast'
import type { WorkType } from '@/types'

const UNITS = [
  { value: 'h', label: 'h (heures)' },
  { value: 'nb', label: 'nb (nombre)' },
  { value: 'km', label: 'km' },
]

const CELL =
  'h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[13px] outline-none transition hover:border-gray-200 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100'

/**
 * Types de travail hors étapes (travail du samedi, repas, kilomètres, formation…) : colonnes
 * supplémentaires de la grille des heures. Modification en place, ajout en bas de liste.
 */
export default function WorkTypesEditor() {
  const types = useWorkTypes(true)
  const actions = useWorkTypeActions()
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [unit, setUnit] = useState('h')

  async function add() {
    if (!code.trim() || !label.trim()) {
      toast('Indiquez un code et un libellé.', 'info')
      return
    }
    try {
      await actions.create({ code: code.trim(), label: label.trim(), unit })
      setCode('')
      setLabel('')
      setUnit('h')
      toast('Type de travail ajouté.', 'success')
    } catch {
      toast('Ajout impossible (code déjà utilisé ?).', 'error')
    }
  }

  return (
    <div>
      <SectionTitle>Types de travail (colonnes de la grille des heures)</SectionTitle>
      <table className="w-full border-collapse text-[13px]">
        <thead className="text-[11px] font-semibold text-gray-500">
          <tr>
            <th className="w-16 border-b border-gray-200 px-1 py-1 text-left">Code</th>
            <th className="border-b border-gray-200 px-1 py-1 text-left">Libellé</th>
            <th className="w-28 border-b border-gray-200 px-1 py-1 text-left">Unité</th>
            <th className="w-12 border-b border-gray-200 px-1 py-1 text-center">Actif</th>
            <th className="w-8 border-b border-gray-200" />
          </tr>
        </thead>
        <tbody>
          {(types.data ?? []).map((type) => (
            <WorkTypeRow key={type.id} type={type} actions={actions} />
          ))}
          <tr>
            <td className="py-1 pr-1">
              <BbInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="1011" maxLength={20} className="w-full" aria-label="Code" />
            </td>
            <td className="py-1 pr-1">
              <BbInput
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Nouveau type…"
                maxLength={255}
                className="w-full"
                aria-label="Libellé"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void add()
                  }
                }}
              />
            </td>
            <td className="py-1 pr-1">
              <BbSelect value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full" aria-label="Unité">
                {UNITS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </BbSelect>
            </td>
            <td colSpan={2} className="py-1">
              <button type="button" onClick={() => void add()} className="h-8 rounded-md bg-anthracite-800 px-3 text-[13px] font-medium text-white hover:bg-anthracite-700">
                Ajouter
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-gray-400">Seules les unités en heures entrent dans le total des heures, le coût et la régie. Un type déjà utilisé est désactivé plutôt que supprimé.</p>
    </div>
  )
}

function WorkTypeRow({ type, actions }: { type: WorkType; actions: ReturnType<typeof useWorkTypeActions> }) {
  const [label, setLabel] = useState(type.label)

  async function save(payload: Parameters<typeof actions.update>[1]) {
    try {
      await actions.update(type.id, payload)
    } catch {
      toast("Le type de travail n'a pas pu être enregistré.", 'error')
    }
  }

  return (
    <tr className={`group border-b border-gray-100 ${type.is_active === false ? 'text-gray-400' : ''}`}>
      <td className="px-1.5 py-0.5 text-gray-500">{type.code}</td>
      <td className="py-0.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label.trim() && label.trim() !== type.label && void save({ label: label.trim() })}
          className={CELL}
          aria-label="Libellé"
        />
      </td>
      <td className="py-0.5">
        <select value={type.unit} onChange={(e) => void save({ unit: e.target.value })} className={`${CELL} px-1`} aria-label="Unité">
          {UNITS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-0.5 text-center">
        <input type="checkbox" checked={type.is_active !== false} onChange={(e) => void save({ is_active: e.target.checked })} className="h-4 w-4 accent-primary-600" aria-label="Actif" />
      </td>
      <td className="py-0.5 text-right">
        <button
          type="button"
          title="Supprimer"
          onClick={() => {
            if (window.confirm(`Supprimer le type « ${type.label} » ?`)) {
              void actions
                .remove(type.id)
                .then((deactivated) => toast(deactivated ? 'Type utilisé dans des rapports : désactivé.' : 'Type supprimé.', 'success'))
                .catch(() => toast('Suppression impossible.', 'error'))
            }
          }}
          className="rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}
