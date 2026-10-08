import { useEffect, useRef } from 'react'
import type { BaseSyntheticEvent } from 'react'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { isAxiosError } from 'axios'
import { toast } from '@/lib/toast'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export const SAVE_LABELS: Record<SaveState, string> = {
  idle: '',
  dirty: 'Modifications non enregistrées',
  saving: 'Enregistrement…',
  saved: 'Enregistré',
  error: "Échec de l'enregistrement",
}

interface Options<V extends FieldValues> {
  /** Nouvelle fiche : pas de sauvegarde automatique pendant la frappe (seulement à la sortie du formulaire). */
  isNew: boolean
  save: (values: V) => Promise<void>
  onStateChange?: (state: SaveState) => void
}

type Submit = (event?: BaseSyntheticEvent) => Promise<void>

/**
 * Champ qui avait le focus quand une nouvelle fiche a été créée automatiquement : la page remonte alors
 * le formulaire avec l'identifiant créé, et le curseur est remis au même endroit.
 */
let pendingFocus: { name: string; at: number } | null = null

/**
 * Sauvegarde automatique d'une fiche, sans bouton : 1,2 s après la dernière modification (2 s pour
 * créer une nouvelle fiche, dès que ses champs obligatoires sont remplis), à la sortie du formulaire,
 * et sur Ctrl+S. Les erreurs 422 de l'API sont reportées sur les champs.
 */
export function useEntityForm<V extends FieldValues>(form: UseFormReturn<V>, options: Options<V>) {
  const submitRef = useRef<Submit>(async () => {})
  const autoSubmitRef = useRef<Submit>(async () => {})
  const isNewRef = useRef(options.isNew)
  const notifyRef = useRef(options.onStateChange)
  const dirtyRef = useRef(false)

  // Garde la dernière version des options sans relancer les abonnements ci-dessous.
  useEffect(() => {
    isNewRef.current = options.isNew
    notifyRef.current = options.onStateChange
    const persist = async (values: V) => {
      options.onStateChange?.('saving')
      const active = document.activeElement
      const focused = options.isNew && active instanceof HTMLElement && active.getAttribute('name') ? active.getAttribute('name') : null
      // Posé avant l'appel : la page remonte le formulaire pendant save() (onCreated → sélection de l'id).
      pendingFocus = focused ? { name: focused, at: Date.now() } : null
      try {
        await options.save(values)
        dirtyRef.current = false
        form.reset(values)
        options.onStateChange?.('saved')
      } catch (error) {
        pendingFocus = null
        options.onStateChange?.('error')
        if (isAxiosError(error) && error.response?.status === 422) {
          const errors = (error.response.data?.errors ?? {}) as Record<string, string[]>
          for (const [field, messages] of Object.entries(errors)) {
            form.setError(field as Path<V>, { message: messages[0] })
          }
          toast(Object.values(errors)[0]?.[0] ?? 'Données invalides.', 'error')
        } else if (isAxiosError(error) && error.response) {
          toast(error.response.data?.message ?? "L'enregistrement a échoué.", 'error')
        }
      }
    }
    submitRef.current = form.handleSubmit(persist)
    // Déclenchement automatique : une fiche encore incomplète attend, sans afficher d'erreur.
    autoSubmitRef.current = form.handleSubmit(persist, () => form.clearErrors())
  })

  // Formulaire remonté après une création automatique : le curseur revient dans le champ en cours.
  useEffect(() => {
    if (pendingFocus && Date.now() - pendingFocus.at < 8000) {
      const field = document.querySelector<HTMLInputElement>(`form [name="${pendingFocus.name}"]`)
      // Formulaire intermédiaire désactivé (fiche en cours de chargement) : on attend le montage suivant.
      if (field && !field.matches(':disabled')) {
        pendingFocus = null
        field.focus()
        if (typeof field.setSelectionRange === 'function' && /^(text|search|tel|url|password)$|^$/.test(field.type ?? '')) {
          const end = field.value.length
          field.setSelectionRange(end, end)
        }
      }
    }
  }, [])

  // Sauvegarde automatique après une pause de frappe (fiche existante uniquement).
  useEffect(() => {
    let timer: number | undefined
    const subscription = form.watch((_values, info) => {
      // Frappe dans un champ (type « change »), ou valeur posée par le code avec setValue (type absent,
      // nom présent : statut choisi dans StatusSelect, numéro proposé…). reset() n'a pas de nom : ignoré.
      const programmatic = info.type === undefined && info.name !== undefined
      if (info.type !== 'change' && !programmatic) {
        return
      }
      dirtyRef.current = true
      notifyRef.current?.('dirty')
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void autoSubmitRef.current(), isNewRef.current ? 2000 : 1200)
    })
    return () => {
      subscription.unsubscribe()
      window.clearTimeout(timer)
    }
  }, [form])

  // Ctrl+S / Cmd+S.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void submitRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /** À brancher sur onSubmit du <form>. */
  function submit(event?: BaseSyntheticEvent) {
    return submitRef.current(event)
  }

  /** À brancher sur onBlur du <form> : enregistre quand le focus quitte le formulaire. */
  function onBlur(event: React.FocusEvent<HTMLFormElement>) {
    if (!event.currentTarget.contains(event.relatedTarget) && dirtyRef.current) {
      void submitRef.current()
    }
  }

  return { submit, onBlur }
}
