import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, getToken, setToken, UNAUTHENTICATED_EVENT } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { LoginResponse, User } from '@/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // loading démarre à true seulement s'il y a un token à valider (évite un setState
  // synchrone dans l'effet ci-dessous).
  const [loading, setLoading] = useState(() => Boolean(getToken()))

  // Au chargement : si un token existe, on récupère l'utilisateur courant.
  useEffect(() => {
    if (!getToken()) {
      return
    }

    api
      .get<User>('/user')
      .then((response) => setUser(response.data))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  // Jeton périmé ou révoqué en cours de session : retour à l'écran de connexion.
  useEffect(() => {
    function onUnauthenticated() {
      setUser(null)
      toast('Session expirée, merci de te reconnecter.', 'error')
    }
    window.addEventListener(UNAUTHENTICATED_EVENT, onUnauthenticated)
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, onUnauthenticated)
  }, [])

  async function login(email: string, password: string): Promise<void> {
    const response = await api.post<LoginResponse>('/login', {
      email,
      password,
      device_name: 'spa',
    })
    setToken(response.data.token)
    setUser(response.data.user)
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/logout')
    } finally {
      setToken(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.')
  }
  return context
}
