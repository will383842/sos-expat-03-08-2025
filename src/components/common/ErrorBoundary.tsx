import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logError } from '../../utils/logging';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    eventId: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const eventId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error, 
      errorInfo: null,
      eventId
    };
  }

  public componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    // Reset error state if resetKeys changed
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some((resetKey, idx) => 
        resetKey !== prevProps.resetKeys?.[idx]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
    
    // Reset on any prop change if specified
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Prevent multiple rapid error logging
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      error,
      errorInfo
    });
    
    // Log error securely (no sensitive data)
    this.logErrorSafely(error, errorInfo);
    
    // Call onError prop if provided
    this.props.onError?.(error, errorInfo);
  }

  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private logErrorSafely = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const sanitizedError = {
        origin: 'frontend' as const,
        error: error.message,
        name: error.name,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        eventId: this.state.eventId,
        context: {
          componentStack: errorInfo.componentStack,
          // Only include stack in development
          ...(process.env.NODE_ENV === 'development' && { 
            stack: error.stack 
          })
        }
      };

      await logError(sanitizedError);
    } catch (logErr) {
      // Fallback logging to console in case of logging service failure
      console.error('Failed to log error:', logErr);
      console.error('Original error:', error);
    }
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    });
  };

  private handleReload = () => {
    // Add loading state to prevent multiple clicks
    try {
      window.location.reload();
    } catch (err) {
      console.error('Failed to reload page:', err);
    }
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  public render() {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI - Mobile First & Accessible
      return (
        <div 
          className="min-h-[200px] p-4 sm:p-6 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
          aria-live="assertive"
          aria-labelledby="error-title"
          aria-describedby="error-description"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <AlertTriangle 
              className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" 
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <h3 
                id="error-title"
                className="text-lg font-semibold text-red-800 mb-2"
              >
                Une erreur est survenue
              </h3>
              <div 
                id="error-description"
                className="text-sm text-red-700 space-y-2"
              >
                <p>
                  Nous avons rencontré un problème lors du chargement de cette section.
                </p>
                <p>
                  L'erreur a été automatiquement signalée à notre équipe technique.
                </p>
                {this.state.eventId && (
                  <p className="text-xs text-red-600">
                    Référence : {this.state.eventId}
                  </p>
                )}
              </div>
              
              {/* Action buttons - Mobile optimized */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button 
                  onClick={this.handleRetry}
                  className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                  aria-label="Réessayer de charger le contenu"
                >
                  <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                  Réessayer
                </button>
                <button 
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                  aria-label="Recharger la page complète"
                >
                  Recharger la page
                </button>
              </div>

              {/* Development details - Secure */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 p-3 bg-gray-100 rounded-md">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded">
                    Détails techniques (développement uniquement)
                  </summary>
                  <div className="mt-3 p-3 bg-gray-900 text-gray-100 rounded-md overflow-auto">
                    <div className="text-xs font-mono space-y-2">
                      <div>
                        <strong className="text-red-400">Erreur :</strong>
                        <p className="mt-1 text-red-300">{this.state.error.toString()}</p>
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong className="text-yellow-400">Stack trace :</strong>
                          <pre className="mt-1 text-gray-300 whitespace-pre-wrap break-all">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong className="text-blue-400">Component Stack :</strong>
                          <pre className="mt-1 text-gray-300 whitespace-pre-wrap break-all">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

