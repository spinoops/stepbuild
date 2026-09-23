import { useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { Icon } from '@/components/icons'
import type { DailyReportActions } from '@/hooks/useDailyReports'
import { toast } from '@/lib/toast'
import type { DailyReport } from '@/types'

const IMAGES = ['image/jpeg', 'image/png', 'image/webp']
const DOCUMENTS = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
const MAX_SIZE = 10 * 1024 * 1024

interface Props {
  report: DailyReport
  actions: DailyReportActions
  /** Photos (images) ou fichiers (documents). */
  mode: 'photos' | 'files'
  readOnly: boolean
}

function fmtSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`
}

/** Photos et fichiers joints au rapport : envoi multiple (bouton ou glisser-déposer), légende, suppression. */
export default function ReportFilesTab({ report, actions, mode, readOnly }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const accepted = mode === 'photos' ? IMAGES : DOCUMENTS
  const files = (report.files ?? []).filter((file) => file.is_image === (mode === 'photos'))

  async function send(list: FileList | null) {
    const all = Array.from(list ?? [])
    const valid = all.filter((file) => accepted.includes(file.type) && file.size <= MAX_SIZE)
    if (valid.length < all.length) {
      toast(mode === 'photos' ? 'Certains fichiers ont été ignorés (JPG, PNG ou WebP, 10 Mo maximum).' : 'Certains fichiers ont été ignorés (PDF, Word, Excel ou texte, 10 Mo maximum).', 'error')
    }
    if (valid.length === 0) {
      return
    }
    setBusy(true)
    try {
      await actions.uploadFiles(valid.slice(0, 12))
      toast(`${valid.length} fichier${valid.length > 1 ? 's' : ''} ajouté${valid.length > 1 ? 's' : ''}.`, 'success')
    } catch (error) {
      toast(isAxiosError(error) ? (error.response?.data?.message ?? "L'envoi a échoué.") : "L'envoi a échoué.", 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`min-h-0 flex-1 overflow-auto rounded-lg border-2 border-dashed p-3 transition ${dragging ? 'border-primary-400 bg-primary-50' : 'border-transparent'}`}
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
          void send(event.dataTransfer.files)
        }
      }}
    >
      <div className="flex flex-wrap gap-3">
        {files.map((file) => (
          <figure key={file.id} className="w-44 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <a href={file.url} target="_blank" rel="noreferrer" className="flex h-28 items-center justify-center bg-gray-100" title={file.original_name}>
              {file.is_image ? (
                <img src={file.url} alt={file.caption ?? file.original_name} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 px-2 text-center text-[11px] text-gray-500">
                  <Icon name="file" className="h-7 w-7 text-gray-400" />
                  <span className="line-clamp-2 break-all">{file.original_name}</span>
                  <span className="text-gray-400">{fmtSize(file.size)}</span>
                </span>
              )}
            </a>
            <figcaption className="space-y-1 p-2">
              <input
                defaultValue={file.caption ?? ''}
                placeholder="Légende…"
                disabled={readOnly}
                onBlur={(event) => {
                  const caption = event.target.value.trim() || null
                  if (caption !== (file.caption ?? null)) {
                    void actions.updateFile(file.id, caption).catch(() => toast("La légende n'a pas pu être enregistrée.", 'error'))
                  }
                }}
                className="h-7 w-full rounded-md border border-gray-200 px-2 text-[12px] outline-none focus:border-primary-400 disabled:border-transparent disabled:bg-transparent"
              />
              {!readOnly && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={() => window.confirm('Supprimer ce fichier ?') && void actions.deleteFile(file.id).catch(() => toast('Suppression impossible.', 'error'))}
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
            disabled={busy}
            className="flex h-[182px] w-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 text-[13px] text-gray-500 transition hover:border-primary-400 hover:text-primary-700 disabled:opacity-50"
          >
            <Icon name={mode === 'photos' ? 'image' : 'paperclip'} className="h-7 w-7" />
            {busy ? 'Envoi en cours…' : mode === 'photos' ? 'Ajouter des photos' : 'Ajouter des fichiers'}
            <span className="px-3 text-center text-[11px] text-gray-400">
              {mode === 'photos' ? 'ou glisser-déposer ici · JPG, PNG, WebP · 10 Mo' : 'ou glisser-déposer ici · PDF, Word, Excel · 10 Mo'}
            </span>
          </button>
        )}
        {readOnly && files.length === 0 && <p className="text-[13px] text-gray-400">{mode === 'photos' ? 'Aucune photo.' : 'Aucun fichier.'}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accepted.join(',')}
        multiple
        hidden
        onChange={(event) => {
          void send(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
