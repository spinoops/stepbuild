import axios from 'axios'
import { toast } from '@/lib/toast'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const TOKEN_KEY = 'baseapp_token'

/** Instance axios partagée, préfixée par /api. */
export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    Accept: 'application/json',
  },
})

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// Ajoute automatiquement le token Bearer à chaque requête.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si l'API répond 401, le token n'est plus valide : on le purge.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      setToken(null)
    }
    // Notifie les erreurs non gérées par les formulaires (réseau / serveur).
    if (!error.response) {
      toast('Impossible de joindre le serveur.', 'error')
    } else if (status >= 500) {
      toast('Une erreur serveur est survenue.', 'error')
    }
    return Promise.reject(error)
  },
)
