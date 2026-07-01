import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './Error.module.css'

type Props = {
  children: ReactNode
  /** Called once when an error is caught — used to report it to observability (the boundary itself
   *  stays presentational and never imports the observability runtime). */
  onError?: (error: Error) => void
  fallback?: ReactNode
}
type State = { error: Error | null }

/** React render-error boundary with an accessible fallback and a retry. Presentational only. */
export class FlowErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error)
  }

  private reset = () => this.setState({ error: null })

  override render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <div role="alert" className={styles.boundary}>
        <p className={styles.boundaryTitle}>Something went wrong</p>
        <p className={styles.boundaryMsg}>{this.state.error.message}</p>
        <button type="button" className={styles.boundaryBtn} onClick={this.reset}>
          Try again
        </button>
      </div>
    )
  }
}
