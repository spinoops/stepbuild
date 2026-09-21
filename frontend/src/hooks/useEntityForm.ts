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
 * Sauvegarde automatique d'une fiche : 1,2 s après la dernière frappe (fiche existante),
 * à la sortie du formulaire, et sur Ctrl+S. Les erreurs 422 de l'API sont reportées sur les champs.
 */
export function useEntityForm<V extends FieldValues>(form: UseFormReturn<V>, options: Options<V>) {
  const submitRef = useRef<Submit>(async () => {})
  const isNewRef = useRef(options.isNew)
  const notifyRef = useRef(options.onStateChange)
  const dirtyRef = useRef(false)

  // Garde la dernière version des options sans relancer les abonnements ci-dessous.
  useEffect(() => {
    isNewRef.current = options.isNew
    notifyRef.current = options.onStateChange
    submitRef.current = form.handleSubmit(async (values) => {
      options.onStateChange?.('saving')
      try {
        await options.save(values)
        dirtyRef.current = false
        form.reset(values)
        options.onStateChange?.('saved')
      } catch (error) {
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
    })
  })

  // Sauvegarde automatique après une pause de frappe (fiche existante uniquement).
  useEffect(() => {
    let timer: number | undefined
    const subscription = form.watch((_values, info) => {
      if (info.type !== 'change') {
        return
      }
      dirtyRef.current = true
      notifyRef.current?.('dirty')
      window.clearTimeout(timer)
      if (!isNewRef.current) {
        timer = window.setTimeout(() => void submitRef.current(), 1200)
      }
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
