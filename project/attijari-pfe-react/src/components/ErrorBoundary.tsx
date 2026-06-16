import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-danger/20 bg-danger/5 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangle className="h-8 w-8 text-danger" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-navy">Une erreur est survenue</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          {this.state.error?.message ?? 'Une erreur inattendue a interrompu le chargement de cette section.'}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-brand border border-danger/30 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-brand bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a01024]"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}
