import { useSettings } from '@/hooks/useSettings'

/** Logo Lachat livré avec l'application (frontend/public/logo-lachat.png). */
const DEFAULT_LOGO = '/logo-lachat.png'

interface BrandProps {
  /** Hauteur du logo en pixels. */
  size?: number
  /** Affiche le nom de l'application à côté du logo. */
  withName?: boolean
  className?: string
  title?: string
}

/**
 * Logo de l'entreprise. Un logo configuré dans les réglages (URL) remplace celui par défaut.
 */
export default function Brand({ size = 24, withName = false, className = '', title }: BrandProps) {
  const { data: settings } = useSettings()
  const src = settings?.app_logo_url || DEFAULT_LOGO
  const name = settings?.app_name ?? 'Lachat Construction'

  return (
    <span className={`flex items-center gap-2 ${className}`} title={title ?? name}>
      <img src={src} alt={name} style={{ height: size }} className="w-auto object-contain" />
      {withName && <span className="border-l border-gray-200 pl-2 text-[13px] text-gray-500">{name}</span>}
    </span>
  )
}
