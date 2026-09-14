import { useSettings } from '@/hooks/useSettings'

interface BrandProps {
  /** Hauteur du logo en pixels. */
  size?: number
  /** Affiche le nom de l'application à côté du logo. */
  withName?: boolean
  className?: string
  title?: string
}

/**
 * Logo Lachat : « LACHAT » en bleu, dernier T en rouge (charte du site).
 * Si un logo est configuré dans les réglages, il est affiché à la place.
 */
export default function Brand({ size = 22, withName = false, className = '', title }: BrandProps) {
  const { data: settings } = useSettings()

  if (settings?.app_logo_url) {
    return (
      <span className={`flex items-center gap-2 ${className}`}>
        <img src={settings.app_logo_url} alt={settings.app_name} style={{ height: size }} className="object-contain" />
        {withName && <span className="font-semibold text-gray-900">{settings.app_name}</span>}
      </span>
    )
  }

  return (
    <span className={`flex items-center gap-2 ${className}`} title={title}>
      <span
        className="select-none font-black italic tracking-tight text-primary-600"
        style={{ fontSize: size, lineHeight: 1 }}
        aria-label={settings?.app_name ?? 'Lachat'}
      >
        LACHA<span className="text-accent-500">T</span>
      </span>
      {withName && settings?.app_name && (
        <span className="border-l border-gray-200 pl-2 text-[13px] text-gray-500">{settings.app_name}</span>
      )}
    </span>
  )
}
