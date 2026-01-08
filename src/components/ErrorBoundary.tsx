import { ReactNode, Component, ErrorInfo } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      return (
        <div className="card p-6 border-red-200 bg-red-50">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Oops! Something went wrong</h3>
              <p className="text-red-700 mb-4 text-sm">
                {this.state.error.message || 'An unexpected error occurred'}
              </p>
              <details className="mb-4">
                <summary className="text-xs text-red-600 cursor-pointer font-semibold">
                  Error details
                </summary>
                <pre className="text-xs bg-red-100 p-2 mt-2 rounded overflow-auto max-h-40 text-red-800">
                  {this.state.error.stack}
                </pre>
              </details>
              <button
                onClick={this.handleReset}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
