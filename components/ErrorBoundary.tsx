import React, { type ComponentType, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const ERROR_LOG_KEY = 'gitick:error_log';
const MAX_ERRORS_STORED = 10;

interface StoredError {
  message: string;
  stack?: string;
  timestamp: number;
  componentStack?: string;
}

const storeErrorLocally = (error: Error, componentStack?: string) => {
  try {
    const stored = localStorage.getItem(ERROR_LOG_KEY);
    const errors: StoredError[] = stored ? JSON.parse(stored) : [];
    errors.unshift({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      componentStack,
    });
    // Keep only the most recent errors
    const trimmed = errors.slice(0, MAX_ERRORS_STORED);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // Silent fail if localStorage is unavailable or quota exceeded
  }
};

// Class component with explicit state and props typing for React 19
class ErrorBoundaryImpl extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare state: ErrorBoundaryState;
  declare props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    storeErrorLocally(error, errorInfo.componentStack ?? undefined);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-dvh bg-primary-50 dark:bg-dark-bg text-primary-900 dark:text-dark-text p-8">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-sm text-primary-500 dark:text-dark-muted mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary-900 dark:bg-dark-surface text-white dark:text-dark-text rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary: ComponentType<ErrorBoundaryProps> = ErrorBoundaryImpl as ComponentType<ErrorBoundaryProps>;
