import { useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '@/components/ui/Modal'
import { useQuoteTemplates } from '@/hooks/useQuoteTemplates'
import { Icon } from '@/components/icons'

interface TemplateChooserProps {
  open: boolean
  onClose: () => void
  /** Modèle choisi (null = devis vide). */
  onChoose: (templateId: number | null) => void
  busy?: boolean
}

/** Choix du modèle de devis à la création : le modèle par défaut est présélectionné. */
export default function TemplateChooser({ open, onClose, onChoose, busy = false }: TemplateChooserProps) {
  const templates = useQuoteTemplates(open)
  const [chosen, setChosen] = useState<number | null | undefined>(undefined)
  const list = templates.data ?? []
  const selected = chosen === undefined ? (list.find((item) => item.is_default)?.id ?? null) : chosen

  const option = (active: boolean) =>
    `flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
      active ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-100' : 'border-gray-200 hover:bg-gray-50'
    }`

  return (
    <Modal open={open} onClose={onClose} title="Nouveau devis">
      <p className="text-[13px] text-gray-500">
        Choisissez le modèle qui fixe les étapes du chantier. Vous pourrez ensuite en ajouter, en retirer ou les réordonner.
      </p>
      <div className="mt-3 max-h-[360px] space-y-1.5 overflow-auto">
        {list.map((template) => (
          <button key={template.id} type="button" onClick={() => setChosen(template.id)} className={option(selected === template.id)}>
            <Icon name="tree" className={`mt-0.5 h-4 w-4 shrink-0 ${selected === template.id ? 'text-primary-600' : 'text-gray-400'}`} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[13px] font-medium text-gray-800">
                {template.name}
                {template.is_default && <span className="rounded-full bg-gray-100 px-1.5 text-[10px] text-gray-500">par défaut</span>}
              </span>
              <span className="block truncate text-[12px] text-gray-500">
                {template.steps?.map((step) => step.label).join(' · ') || 'Aucune étape'}
              </span>
            </span>
          </button>
        ))}
        <button type="button" onClick={() => setChosen(null)} className={option(selected === null)}>
          <Icon name="file" className={`mt-0.5 h-4 w-4 shrink-0 ${selected === null ? 'text-primary-600' : 'text-gray-400'}`} />
          <span className="text-[13px]">
            <span className="block font-medium text-gray-800">Devis vide</span>
            <span className="block text-[12px] text-gray-500">Vous ajouterez les étapes une à une.</span>
          </span>
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Link to="/modeles-devis" onClick={onClose} className="text-[12px] text-gray-500 hover:text-primary-700 hover:underline">
          Gérer les modèles
        </Link>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-md px-3 text-[13px] text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          <button
            type="button"
            disabled={busy || templates.isLoading}
            onClick={() => onChoose(selected)}
            className="h-8 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700 disabled:opacity-40"
          >
            Créer le devis
          </button>
        </div>
      </div>
    </Modal>
  )
}
