import type { ReactNode } from 'react'

/** Conteneur défilant pour les pages « classiques » (tableau de bord, administration). */
export default function PagePane({ children }: { children: ReactNode }) {
  return <div className="h-full overflow-auto p-5 text-[14px]">{children}</div>
}
