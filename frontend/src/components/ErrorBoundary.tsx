import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  /** Change à chaque navigation : une nouvelle page efface l'erreur précédente. */
  resetKey: string
  children: ReactNode
}

interface State {
  error: Error | null
  resetKey: string
}

/**
 * Isole les erreurs d'une page : l'en-tête, le ruban et les onglets restent utilisables,
 * et l'utilisateur peut réessayer ou changer de page au lieu d'avoir un écran blanc.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur dans la page :', error, info.componentStack)
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[15px] font-semibold text-gray-800">Cette page a rencontré une erreur.</p>
        <p className="max-w-lg text-[13px] text-gray-500">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="h-8 rounded-md bg-accent-600 px-3 text-[13px] font-medium text-white hover:bg-accent-700"
        >
          Réessayer
        </button>
      </div>
    )
  }
}
