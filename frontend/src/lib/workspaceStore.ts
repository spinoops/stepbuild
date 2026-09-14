import { useSyncExternalStore } from 'react'

/**
 * État de l'espace de travail « façon BauBit » : onglets ouverts, projet et document
 * courants (barre bleue), texte de la barre d'état. Store externe minimal
 * (même principe que toast.ts) pour rester utilisable depuis n'importe quel composant.
 */
export interface WorkspaceTab {
  path: string
  label: string
}

export interface WorkspaceStatus {
  /** Texte à gauche de la 1ère ligne de la barre d'état (ex. « Montant total : … »). */
  left?: string
  /** Texte à droite de la 1ère ligne. */
  right?: string
  /** Nombre d'entrées de la grille principale (« Nombre d'entrées : N »). */
  entries?: number | null
  /** Totaux affichés sur la 2ème ligne (ex. « Brut: … Net: … »). */
  totals?: string
  /** La page affiche des données d'exemple. */
  demo?: boolean
}

interface WorkspaceState {
  tabs: WorkspaceTab[]
  projectId: string | null
  documentId: string | null
  status: WorkspaceStatus
  asideOpen: boolean
}

let state: WorkspaceState = {
  tabs: [],
  projectId: null,
  documentId: null,
  status: {},
  asideOpen: true,
}

const listeners = new Set<() => void>()

function update(partial: Partial<WorkspaceState>): void {
  state = { ...state, ...partial }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): WorkspaceState {
  return state
}

/** Ouvre un onglet (sans doublon). */
export function openTab(path: string, label: string): void {
  if (!state.tabs.some((tab) => tab.path === path)) {
    update({ tabs: [...state.tabs, { path, label }] })
  }
}

/** Renomme un onglet ouvert (ex. « Rapports journaliers : 2600-001 - … »). */
export function setTabLabel(path: string, label: string): void {
  const tab = state.tabs.find((item) => item.path === path)
  if (tab && tab.label !== label) {
    update({ tabs: state.tabs.map((item) => (item.path === path ? { ...item, label } : item)) })
  }
}

/** Ferme un onglet et renvoie le chemin vers lequel naviguer (voisin ou tableau de bord). */
export function closeTab(path: string): string {
  const index = state.tabs.findIndex((tab) => tab.path === path)
  const tabs = state.tabs.filter((tab) => tab.path !== path)
  update({ tabs })
  const neighbour = tabs[index - 1] ?? tabs[index] ?? null
  return neighbour?.path ?? '/dashboard'
}

export function setProject(projectId: string | null): void {
  update({ projectId, documentId: null })
}

export function setDocument(documentId: string | null): void {
  update({ documentId })
}

export function setStatus(status: WorkspaceStatus): void {
  update({ status })
}

export function toggleAside(): void {
  update({ asideOpen: !state.asideOpen })
}

export function useWorkspace(): WorkspaceState {
  return useSyncExternalStore(subscribe, getSnapshot)
}
