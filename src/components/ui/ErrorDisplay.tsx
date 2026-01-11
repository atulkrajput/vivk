'use client'

import { useState } from 'react'
import { AlertCircle, RefreshCw, ExternalLink, X } from 'lucide-react'
import { Button } from './Button'

export interface ErrorInfo {
  error: string
  code?: string
  retryable?: boolean
  action?: string
  timestamp?: string
}

interface ErrorDisplayProps {
  error: ErrorInfo
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  variant?: 'inline' | 'modal' | 'banner'
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  className = '',
  variant = 'inline'
}: ErrorDisplayProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (!onRetry) return
    
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  const getErrorIcon = () => {
    switch (error.code) {
      case 'DAILY_LIMIT_REACHED':
      case 'SUBSCRIPTION_REQUIRED':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case 'AI_SERVICE_UNAVAILABLE':
      case 'SERVICE_UNAVAILABLE':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'RATE_LIMIT_EXCEEDED':
      case 'TOO_MANY_REQUESTS':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getErrorColor = () => {
    switch (error.code) {
      case 'DAILY_LIMIT_REACHED':
      case 'SUBSCRIPTION_REQUIRED':
        return 'orange'
      case 'RATE_LIMIT_EXCEEDED':
      case 'TOO_MANY_REQUESTS':
        return 'yellow'
      default:
        return 'red'
    }
  }

  const color = getErrorColor()

  if (variant === 'banner') {
    return (
      <div className={`bg-${color}-50 border-l-4 border-${color}-400 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getErrorIcon()}
            <div className="ml-3">
              <p className={`text-sm text-${color}-700`}>{error.error}</p>
              {error.action && (
                <p className={`text-xs text-${color}-600 mt-1`}>
                  Suggested action: {error.action}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {error.retryable && onRetry && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                size="sm"
                variant="outline"
              >
                {isRetrying ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`text-${color}-400 hover:text-${color}-600`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center mb-4">
            {getErrorIcon()}
            <h3 className="ml-3 text-lg font-medium text-gray-900">
              Error
            </h3>
          </div>
          
          <p className="text-gray-600 mb-4">{error.error}</p>
          
          {error.action && (
            <p className="text-sm text-gray-500 mb-4">
              <strong>Suggested action:</strong> {error.action}
            </p>
          )}
          
          <div className="flex justify-end space-x-3">
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="outline"
              >
                Close
              </Button>
            )}
            {error.retryable && onRetry && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default inline variant
  return (
    <div className={`rounded-md bg-${color}-50 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getErrorIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium text-${color}-800`}>
            {error.code ? `Error: ${error.code}` : 'Error'}
          </h3>
          <div className={`mt-2 text-sm text-${color}-700`}>
            <p>{error.error}</p>
            {error.action && (
              <p className="mt-1">
                <strong>Suggested action:</strong> {error.action}
              </p>
            )}
          </div>
          {(error.retryable && onRetry) || onDismiss ? (
            <div className="mt-4">
              <div className="flex space-x-2">
                {error.retryable && onRetry && (
                  <Button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    size="sm"
                    variant="primary"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Try Again
                      </>
                    )}
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    onClick={onDismiss}
                    size="sm"
                    variant="ghost"
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// Specialized error displays for common scenarios
export function NetworkErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      error={{
        error: "Network connection issue. Please check your internet and try again.",
        code: "NETWORK_ERROR",
        retryable: true,
        action: "Check your internet connection"
      }}
      onRetry={onRetry}
    />
  )
}

export function AIServiceErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      error={{
        error: "AI service is temporarily unavailable. Please try again in a few moments.",
        code: "AI_SERVICE_UNAVAILABLE",
        retryable: true,
        action: "Wait a moment and try again"
      }}
      onRetry={onRetry}
    />
  )
}

export function DailyLimitErrorDisplay({ onUpgrade }: { onUpgrade?: () => void }) {
  return (
    <div className="rounded-md bg-orange-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-orange-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-orange-800">
            Daily Limit Reached
          </h3>
          <div className="mt-2 text-sm text-orange-700">
            <p>You've reached your daily message limit of 20 messages.</p>
            <p className="mt-1">Upgrade to Pro for unlimited messages at just ₹499/month.</p>
          </div>
          <div className="mt-4">
            <div className="flex space-x-2">
              {onUpgrade && (
                <Button
                  onClick={onUpgrade}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Upgrade to Pro
                </Button>
              )}
              <Button
                onClick={() => window.location.reload()}
                size="sm"
                variant="outline"
              >
                Check Limit Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}