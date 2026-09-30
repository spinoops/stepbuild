import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Icon } from '@/components/icons'
import { DOCUMENT_TYPE_LABELS } from '@/lib/status'
import type { DocumentDetail } from '@/types'

/**
 * Aperçu du document tel que le client le recevra : le PDF est produit par le serveur (page de garde
 * avec récapitulation, puis détail des positions) et affiché tel quel. Boutons pour télécharger et imprimer.
 */
export default function DocumentPreview({ document: doc }: { document: DocumentDetail }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [url, setUrl] = useState<string | null>(null)

  // Toujours régénéré à l'ouverture de l'onglet : le devis a pu changer entre-temps.
  const pdf = useQuery({
    queryKey: ['documents', 'pdf', doc.id],
    queryFn: async () => (await api.get<Blob>(`/documents/${doc.id}/pdf`, { responseType: 'blob' })).data,
    staleTime: 0,
    gcTime: 0,
  })

  useEffect(() => {
    if (!pdf.data) {
      return
    }
    const objectUrl = URL.createObjectURL(pdf.data)
    // L'URL objet n'existe qu'après la réponse : état dérivé d'une ressource externe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [pdf.data])

  const fileName = `${DOCUMENT_TYPE_LABELS[doc.type]} ${doc.number}.pdf`
  const button = 'flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-40'

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-100">
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <a href={url ?? undefined} download={fileName} aria-disabled={!url} className={`${button} ${url ? '' : 'pointer-events-none opacity-40'}`}>
          <Icon name="export" className="h-4 w-4 text-gray-500" />
          Télécharger le PDF
        </a>
        <button type="button" disabled={!url} onClick={() => frame.current?.contentWindow?.print()} className={button}>
          <Icon name="print" className="h-4 w-4 text-gray-500" />
          Imprimer
        </button>
        <button type="button" onClick={() => void pdf.refetch()} disabled={pdf.isFetching} className={button} title="Régénérer l'aperçu">
          <Icon name="refresh" className="h-4 w-4 text-gray-500" />
          Actualiser
        </button>
        <span className="ml-2 text-[12px] text-gray-400">
          {pdf.isFetching ? 'Préparation du PDF…' : pdf.isError ? "L'aperçu n'a pas pu être produit." : 'Tel que le client le recevra. Les remarques internes et les sous-détails ne sont jamais imprimés.'}
        </span>
      </div>
      {url ? (
        <iframe ref={frame} src={url} title={`Aperçu ${doc.number}`} className="min-h-0 w-full flex-1 border-0" />
      ) : (
        <div className="flex flex-1 items-center justify-center text-[13px] text-gray-400">{pdf.isError ? 'Aperçu indisponible.' : 'Préparation du PDF…'}</div>
      )}
    </div>
  )
}
