"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { RefreshCw, AlertTriangle, Bug, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you might want to report this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo)
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // This is where you would send the error to your error reporting service
    // For example: Sentry, LogRocket, Bugsnag, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    console.log('Error report:', errorReport)
    
    // Example: Send to analytics or error tracking service
    // analytics.track('Error Boundary Triggered', errorReport)
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full bg-black/40 backdrop-blur-sm border-red-400/50 p-8">
            <div className="text-center space-y-6">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>
              </div>

              {/* Error Title */}
              <div>
                <h1 className="text-3xl font-bold text-red-400 mb-2">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-300 text-lg">
                  We encountered an unexpected error in the AI Startup Battle Arena
                </p>
              </div>

              {/* Error Details */}
              <Alert className="bg-red-900/20 border-red-400/50 text-left">
                <Bug className="h-4 w-4" />
                <AlertTitle className="text-red-400">Error Details</AlertTitle>
                <AlertDescription className="text-gray-300 mt-2">
                  <div className="space-y-2">
                    <p><strong>Error ID:</strong> {this.state.errorId}</p>
                    <p><strong>Message:</strong> {this.state.error?.message || 'Unknown error'}</p>
                    <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Error Stack (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                <Alert className="bg-yellow-900/20 border-yellow-400/50 text-left">
                  <AlertTitle className="text-yellow-400">Development Info</AlertTitle>
                  <AlertDescription className="text-gray-300 mt-2">
                    <details className="mt-2">
                      <summary className="cursor-pointer text-yellow-400 hover:text-yellow-300">
                        Show Error Stack
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto bg-black/50 p-3 rounded border text-gray-300 max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                    {this.state.errorInfo?.componentStack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-yellow-400 hover:text-yellow-300">
                          Show Component Stack
                        </summary>
                        <pre className="mt-2 text-xs overflow-auto bg-black/50 p-3 rounded border text-gray-300 max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={this.handleReload}
                  variant="outline"
                  className="border-gray-400 text-gray-300 hover:bg-gray-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="border-purple-400 text-purple-400 hover:bg-purple-900/20"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-sm text-gray-400 space-y-2">
                <p>If this problem persists, please try:</p>
                <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
                  <li>Refreshing the page</li>
                  <li>Checking your internet connection</li>
                  <li>Clearing your browser cache</li>
                  <li>Ensuring all API keys are properly configured</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    // Log the error
    console.error('useErrorHandler caught error:', error, errorInfo)
    
    // In a real app, you might want to show a toast notification
    // or redirect to an error page
    throw error // Re-throw to trigger error boundary
  }, [])
}

// HOC version for easier wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default ErrorBoundary