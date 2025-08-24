'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some((key, idx) => 
          prevProps.resetKeys?.[idx] !== key
        );
        if (hasResetKeyChanged) {
          this.resetError();
        }
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetError();
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // In a real app, you would send this to an error tracking service
    // like Sentry, LogRocket, or Bugsnag
    if (process.env.NODE_ENV === 'development') {
      console.group('🐛 Error Boundary Report');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Example: Send to error tracking service
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     contexts: {
    //       react: {
    //         componentStack: errorInfo.componentStack,
    //       },
    //     },
    //   });
    // }
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error!}
          resetError={this.resetError}
          errorInfo={this.state.errorInfo || undefined}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError, 
  errorInfo 
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleCopyError = () => {
    const errorText = `
Error: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo?.componentStack || 'N/A'}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error details copied to clipboard');
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">
            We apologize for the inconvenience. An unexpected error has occurred.
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={resetError} 
            className="w-full"
            variant="default"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Button 
            onClick={handleReload} 
            className="w-full"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
          
          <Button 
            onClick={handleGoHome} 
            className="w-full"
            variant="outline"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="ghost"
            size="sm"
            className="w-full text-gray-500"
          >
            <Bug className="w-4 h-4 mr-2" />
            {showDetails ? 'Hide' : 'Show'} Error Details
          </Button>

          {showDetails && (
            <div className="mt-3 p-3 bg-gray-50 rounded border text-xs">
              <div className="font-mono">
                <p className="font-semibold mb-1">Error:</p>
                <p className="text-red-600 mb-2">{error.message}</p>
                
                {error.stack && (
                  <>
                    <p className="font-semibold mb-1">Stack Trace:</p>
                    <pre className="whitespace-pre-wrap text-gray-600 mb-2">
                      {error.stack}
                    </pre>
                  </>
                )}
                
                {errorInfo?.componentStack && (
                  <>
                    <p className="font-semibold mb-1">Component Stack:</p>
                    <pre className="whitespace-pre-wrap text-gray-600">
                      {errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
              
              <Button
                onClick={handleCopyError}
                variant="outline"
                size="sm"
                className="mt-2 w-full"
              >
                Copy Error Details
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Utility hook for error handling
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error | string) => {
    const errorObj = error instanceof Error ? error : new Error(error);
    setError(errorObj);
    console.error('Handled error:', errorObj);
  }, []);

  // Throw the error to be caught by ErrorBoundary
  if (error) {
    throw error;
  }

  return { handleError, resetError };
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Custom error fallback for specific contexts
export const MinimalErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError 
}) => (
  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
        <span className="text-red-800 text-sm font-medium">
          Something went wrong
        </span>
      </div>
      <Button
        onClick={resetError}
        size="sm"
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-100"
      >
        Retry
      </Button>
    </div>
    {process.env.NODE_ENV === 'development' && (
      <p className="text-red-700 text-xs mt-2 font-mono">
        {error.message}
      </p>
    )}
  </div>
);

export { ErrorBoundary };
export type { ErrorBoundaryProps, ErrorFallbackProps };
