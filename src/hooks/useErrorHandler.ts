'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ErrorInfo } from '@/components/ui/ErrorDisplay'

interface UseErrorHandlerOptions {
  onError?: (error: ErrorInfo) => void
  redirectOnSessionExpired?: boolean
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [error, setError] = useState<ErrorInfo | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const router = useRouter()

  const handleError = useCallback((error: any, context?: Record<string, any>) => {
    let errorInfo: ErrorInfo

    // Handle different error types
    if (error?.response) {
      // Axios-style error response
      const data = error.response.data
      errorInfo = {
        error: data.error || 'An error occurred',
        code: data.code,
        retryable: data.retryable || false,
        action: data.action,
        timestamp: data.timestamp
      }
    } else if (error?.error) {
      // API response error
      errorInfo = {
        error: error.error,
        code: error.code,
        retryable: error.retryable || false,
        action: error.action,
        timestamp: error.timestamp
      }
    } else if (error instanceof Error) {
      // JavaScript Error object
      errorInfo = {
        error: error.message,
        code: 'UNKNOWN_ERROR',
        retryable: true
      }
    } else if (typeof error === 'string') {
      // String error
      errorInfo = {
        error,
        code: 'UNKNOWN_ERROR',
        retryable: true
      }
    } else {
      // Unknown error type
      errorInfo = {
        error: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        retryable: true
      }
    }

    // Handle session expiration
    if (errorInfo.code === 'SESSION_EXPIRED' || errorInfo.code === 'UNAUTHORIZED') {
      if (options.redirectOnSessionExpired !== false) {
        router.push('/auth/login?expired=true')
        return
      }
    }

    // Handle daily limit reached
    if (errorInfo.code === 'DAILY_LIMIT_REACHED') {
      // Could trigger upgrade modal here
    }

    setError(errorInfo)
    
    // Call custom error handler if provided
    if (options.onError) {
      options.onError(errorInfo)
    }

    // Log error for debugging
    console.error('Error handled:', {
      errorInfo,
      context,
      timestamp: new Date().toISOString()
    })
  }, [router, options])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const retry = useCallback(async (retryFn?: () => Promise<void>) => {
    if (!retryFn) return

    setIsRetrying(true)
    try {
      await retryFn()
      clearError()
    } catch (retryError) {
      handleError(retryError)
    } finally {
      setIsRetrying(false)
    }
  }, [handleError, clearError])

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry
  }
}

// Specialized hook for API calls
export function useApiErrorHandler() {
  const { handleError, ...rest } = useErrorHandler({
    redirectOnSessionExpired: true
  })

  const handleApiError = useCallback(async (response: Response) => {
    if (!response.ok) {
      try {
        const errorData = await response.json()
        handleError(errorData)
        return errorData
      } catch (parseError) {
        // If we can't parse the error response, create a generic error
        const genericError = {
          error: `Request failed with status ${response.status}`,
          code: `HTTP_${response.status}`,
          retryable: response.status >= 500
        }
        handleError(genericError)
        return genericError
      }
    }
    return null
  }, [handleError])

  const apiCall = useCallback(async <T>(
    apiFunction: () => Promise<Response>,
    options?: {
      onSuccess?: (data: T) => void
      onError?: (error: ErrorInfo) => void
    }
  ): Promise<T | null> => {
    try {
      const response = await apiFunction()
      
      if (!response.ok) {
        const error = await handleApiError(response)
        if (options?.onError && error) {
          options.onError(error)
        }
        return null
      }

      const data = await response.json()
      if (options?.onSuccess) {
        options.onSuccess(data)
      }
      return data
    } catch (networkError) {
      const error = {
        error: 'Network error. Please check your connection and try again.',
        code: 'NETWORK_ERROR',
        retryable: true,
        action: 'Check your internet connection'
      }
      handleError(error)
      if (options?.onError) {
        options.onError(error)
      }
      return null
    }
  }, [handleApiError, handleError])

  return {
    ...rest,
    handleApiError,
    apiCall
  }
}

// Hook for handling form submission errors
export function useFormErrorHandler() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const { handleError, ...rest } = useErrorHandler()

  const handleFormError = useCallback((error: any) => {
    // Handle validation errors
    if (error?.fieldErrors) {
      setFieldErrors(error.fieldErrors)
      return
    }

    // Handle Zod validation errors
    if (error?.issues) {
      const errors: Record<string, string> = {}
      error.issues.forEach((issue: any) => {
        if (issue.path && issue.path.length > 0) {
          errors[issue.path[0]] = issue.message
        }
      })
      setFieldErrors(errors)
      return
    }

    // Handle general errors
    handleError(error)
  }, [handleError])

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({})
  }, [])

  const getFieldError = useCallback((fieldName: string) => {
    return fieldErrors[fieldName]
  }, [fieldErrors])

  return {
    ...rest,
    fieldErrors,
    handleFormError,
    clearFieldErrors,
    getFieldError
  }
}