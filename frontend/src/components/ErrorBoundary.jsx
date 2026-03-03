import { Component } from 'react';
import i18next from 'i18next';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const t = (key, fallback) => i18next.t(`app:${key}`, fallback);

      return (
        <div className="min-h-screen flex items-center justify-center bg-cream px-4">
          <div className="max-w-lg w-full bg-surface rounded-2xl border border-red-100 shadow-soft p-8 text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-red-50 mb-5">
              <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-ink mb-2">
              {t('error.title', 'An error occurred')}
            </h2>
            <p className="text-sm text-ink-400 mb-6">
              {t('error.description', 'The application encountered an unexpected error. Check the console for details.')}
            </p>
            {this.state.error && (
              <pre className="text-left text-xs bg-cream border border-cream-200 rounded-xl p-4 text-red-600 overflow-auto mb-6 max-h-40">
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-primary"
            >
              {t('error.retry', 'Retry')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
