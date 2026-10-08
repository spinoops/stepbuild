import { useState } from 'react'
import { Icon } from '@/components/icons'
import { useUnitActions, useUnits } from '@/hooks/useUnits'
import { toast } from '@/lib/toast'
import type { Unit } from '@/types'

const CELL =
  'h-8 w-full rounded border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-gray-200 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100'

/**
 * Unités de mesure proposées dans les devis et le catalogue : code imprimé, libellé, ordre, actif.
 * Modification en place, ajout en bas de liste, flèches pour réordonner.
 */
export default function UnitsEditor() {
  const units = useUnits(true)
  const actions = useUnitActions()
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const list = units.data ?? []

  async function add() {
    if (!code.trim()) {
      toast('Indiquez le code de l’unité (ce qui s’imprime : M2, Pce…).', 'info')
      return
    }
    try {
      await actions.create({ code: code.trim(), label: label.trim() || null })
      setCode('')
      setLabel('')
      toast('Unité ajoutée.', 'success')
    } catch {
      toast('Ajout impossible (code déjà utilisé ?).', 'error')
    }
  }

  function move(index: number, delta: number) {
    const ids = list.map((unit) => unit.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void actions.reorder(ids).catch(() => toast("L'ordre n'a pas pu être enregistré.", 'error'))
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">Unités de mesure</h3>
      <p className="mb-4 mt-1 text-sm text-gray-500">
        Proposées dans les devis et le catalogue, dans cet ordre. Le <b>code</b> est ce qui s'imprime sur les documents.
        Une unité désactivée n'est plus proposée, mais les lignes qui l'utilisent la conservent.
      </p>
      <table className="w-full border-collapse text-sm">
        <thead className="text-xs font-semibold text-gray-500">
          <tr>
            <th className="w-24 border-b border-gray-200 px-2 py-1 text-left">Code</th>
            <th className="border-b border-gray-200 px-2 py-1 text-left">Libellé</th>
            <th className="w-14 border-b border-gray-200 px-2 py-1 text-center">Actif</th>
            <th className="w-24 border-b border-gray-200" />
          </tr>
        </thead>
        <tbody>
          {list.map((unit, index) => (
            <UnitRow key={unit.id} unit={unit} actions={actions} onMove={(delta) => move(index, delta)} first={index === 0} last={index === list.length - 1} />
          ))}
          <tr>
            <td className="py-2 pr-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Pal" maxLength={20} className={`${CELL} border-gray-300`} aria-label="Code" />
            </td>
            <td className="py-2 pr-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Palette"
                maxLength={100}
                className={`${CELL} border-gray-300`}
                aria-label="Libellé"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void add()
                  }
                }}
              />
            </td>
            <td colSpan={2} className="py-2">
              <button type="button" onClick={() => void add()} className="h-8 rounded-md bg-anthracite-800 px-3 text-sm font-medium text-white hover:bg-anthracite-700">
                Ajouter
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

interface UnitRowProps {
  unit: Unit
  actions: ReturnType<typeof useUnitActions>
  onMove: (delta: number) => void
  first: boolean
  last: boolean
}

function UnitRow({ unit, actions, onMove, first, last }: UnitRowProps) {
  const [code, setCode] = useState(unit.code)
  const [label, setLabel] = useState(unit.label ?? '')

  async function save(payload: Parameters<typeof actions.update>[1]) {
    try {
      await actions.update(unit.id, payload)
    } catch {
      toast("L'unité n'a pas pu être enregistrée (code déjà utilisé ?).", 'error')
      setCode(unit.code)
    }
  }

  return (
    <tr className={`group border-b border-gray-100 ${unit.is_active ? '' : 'text-gray-400'}`}>
      <td className="py-0.5 pr-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} onBlur={() => code.trim() && code.trim() !== unit.code && void save({ code: code.trim() })} maxLength={20} className={CELL} aria-label="Code" />
      </td>
      <td className="py-0.5 pr-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label.trim() !== (unit.label ?? '') && void save({ label: label.trim() || null })} maxLength={100} className={CELL} aria-label="Libellé" />
      </td>
      <td className="py-0.5 text-center">
        <input type="checkbox" checked={unit.is_active} onChange={(e) => void save({ is_active: e.target.checked })} className="h-4 w-4 accent-primary-600" aria-label="Active" />
      </td>
      <td className="py-0.5 text-right">
        <span className="inline-flex opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
          <button type="button" title="Monter" disabled={first} onClick={() => onMove(-1)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30">
            <Icon name="chevron" className="h-3.5 w-3.5 -rotate-90" />
          </button>
          <button type="button" title="Descendre" disabled={last} onClick={() => onMove(1)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30">
            <Icon name="chevron" className="h-3.5 w-3.5 rotate-90" />
          </button>
          <button
            type="button"
            title="Supprimer"
            onClick={() => {
              if (window.confirm(`Supprimer l'unité « ${unit.code} » ? Les lignes qui l'utilisent la conservent.`)) {
                void actions.remove(unit.id).then(() => toast('Unité supprimée.', 'success')).catch(() => toast('Suppression impossible.', 'error'))
              }
            }}
            className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-600"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        </span>
      </td>
    </tr>
  )
}
