import { useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { Icon } from '@/components/icons'
import { useDeleteProjectPhoto, useUpdateProjectPhoto, useUploadProjectPhotos } from '@/hooks/useProjects'
import { toast } from '@/lib/toast'
import type { Project } from '@/types'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024

interface Props {
  project: Project
  readOnly: boolean
}

/** Photos de présentation : envoi multiple (bouton ou glisser-déposer), légende, couverture. */
export default function ProjectPhotosTab({ project, readOnly }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const upload = useUploadProjectPhotos(project.id)
  const update = useUpdateProjectPhoto(project.id)
  const remove = useDeleteProjectPhoto(project.id)
  const photos = project.photos ?? []

  function send(list: FileList | null) {
    const files = Array.from(list ?? [])
    const valid = files.filter((file) => ACCEPTED.includes(file.type) && file.size <= MAX_SIZE)
    if (valid.length < files.length) {
      toast('Certains fichiers ont été ignorés (JPG, PNG ou WebP, 10 Mo maximum).', 'error')
    }
    if (valid.length === 0) {
      return
    }
    upload.mutate(valid.slice(0, 12), {
      onSuccess: (created) => toast(`${created.length} photo${created.length > 1 ? 's' : ''} ajoutée${created.length > 1 ? 's' : ''}.`, 'success'),
      onError: (error) =>
        toast(isAxiosError(error) ? (error.response?.data?.message ?? "L'envoi a échoué.") : "L'envoi a échoué.", 'error'),
    })
  }

  return (
    <div
      className={`mt-4 h-[300px] overflow-auto rounded-lg border-2 border-dashed p-3 transition ${
        dragging ? 'border-primary-400 bg-primary-50' : 'border-transparent'
      }`}
      onDragOver={(event) => {
        if (!readOnly) {
          event.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!readOnly) {
          send(event.dataTransfer.files)
        }
      }}
    >
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <figure key={photo.id} className="w-44 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <a href={photo.url} target="_blank" rel="noreferrer" className="relative block h-28 bg-gray-100">
              <img src={photo.url} alt={photo.caption ?? photo.original_name} loading="lazy" className="h-full w-full object-cover" />
              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-anthracite-900/80 px-2 py-0.5 text-[10px] font-medium text-white">
                  Couverture
                </span>
              )}
            </a>
            <figcaption className="space-y-1 p-2">
              <input
                defaultValue={photo.caption ?? ''}
                placeholder="Légende…"
                disabled={readOnly}
                onBlur={(event) => {
                  const caption = event.target.value.trim() || null
                  if (caption !== (photo.caption ?? null)) {
                    update.mutate({ id: photo.id, caption })
                  }
                }}
                className="h-7 w-full rounded-md border border-gray-200 px-2 text-[12px] outline-none focus:border-primary-400 disabled:border-transparent disabled:bg-transparent"
              />
              {!readOnly && (
                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => update.mutate({ id: photo.id, cover: true })}
                    className="rounded px-1 py-0.5 text-gray-500 hover:bg-gray-100 disabled:opacity-0"
                  >
                    Mettre en couverture
                  </button>
                  <button
                    type="button"
                    title="Supprimer la photo"
                    onClick={() => window.confirm('Supprimer cette photo ?') && remove.mutate(photo.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </figcaption>
          </figure>
        ))}

        {!readOnly && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="flex h-[182px] w-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 text-[13px] text-gray-500 transition hover:border-primary-400 hover:text-primary-700 disabled:opacity-50"
          >
            <Icon name="image" className="h-7 w-7" />
            {upload.isPending ? 'Envoi en cours…' : 'Ajouter des photos'}
            <span className="px-3 text-center text-[11px] text-gray-400">ou glisser-déposer ici · JPG, PNG, WebP · 10 Mo</span>
          </button>
        )}
        {readOnly && photos.length === 0 && <p className="text-[13px] text-gray-400">Aucune photo pour ce projet.</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        hidden
        onChange={(event) => {
          send(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
