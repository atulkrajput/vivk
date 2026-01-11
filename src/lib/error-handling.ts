// Comprehensive error handling utilities for VIVK MVP

import { NextResponse } from 'next/server'
import { logSecureError } from './security'

// Error types and codes
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Usage and subscription errors
  DAILY_LIMIT_REACHED = 'DAILY_LIMIT_REACHED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  
  // AI service errors
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_RATE_LIMIT_EXCEEDED = 'AI_RATE_LIMIT_EXCEEDED',
  AI_GENERATION_FAILED = 'AI_GENERATION_FAILED',
  AI_TIMEOUT = 'AI_TIMEOUT',
  
  // Payment errors
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  INVALID_PAYMENT_METHOD = 'INVALID_PAYMENT_METHOD',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Custom error class with enhanced information
export class VivkError extends Error {
  public readonly code: ErrorCode
  public readonly severity: ErrorSeverity
  public readonly userMessage: string
  public readonly retryable: boolean
  public readonly context: Record<string, any>
  public readonly timestamp: Date

  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    retryable: boolean = false,
    context: Record<string, any> = {}
  ) {
    super(message)
    this.name = 'VivkError'
    this.code = code
    this.severity = severity
    this.userMessage = userMessage
    this.retryable = retryable
    this.context = context
    this.timestamp = new Date()
  }
}

// User-friendly error messages
export const errorMessages: Record<ErrorCode, { message: string; action?: string }> = {
  // Authentication errors
  [ErrorCode.UNAUTHORIZED]: {
    message: 'Please sign in to access this feature.',
    action: 'Sign in to your account'
  },
  [ErrorCode.SESSION_EXPIRED]: {
    message: 'Your session has expired. Please sign in again.',
    action: 'Sign in again'
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    message: 'Invalid email or password. Please check your credentials and try again.',
    action: 'Check your credentials'
  },
  [ErrorCode.EMAIL_ALREADY_EXISTS]: {
    message: 'An account with this email already exists.',
    action: 'Try signing in instead'
  },
  
  // Validation errors
  [ErrorCode.INVALID_INPUT]: {
    message: 'Please check your input and try again.',
    action: 'Correct the highlighted fields'
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    message: 'Please fill in all required fields.',
    action: 'Complete the form'
  },
  [ErrorCode.INVALID_FORMAT]: {
    message: 'Please check the format of your input.',
    action: 'Use the correct format'
  },
  
  // Usage and subscription errors
  [ErrorCode.DAILY_LIMIT_REACHED]: {
    message: 'You\'ve reached your daily message limit. Upgrade to Pro for unlimited messages.',
    action: 'Upgrade to Pro'
  },
  [ErrorCode.SUBSCRIPTION_REQUIRED]: {
    message: 'This feature requires a Pro or Business subscription.',
    action: 'Upgrade your plan'
  },
  [ErrorCode.SUBSCRIPTION_EXPIRED]: {
    message: 'Your subscription has expired. Please renew to continue using premium features.',
    action: 'Renew subscription'
  },
  
  // AI service errors
  [ErrorCode.AI_SERVICE_UNAVAILABLE]: {
    message: 'AI service is temporarily unavailable. Please try again in a few moments.',
    action: 'Try again later'
  },
  [ErrorCode.AI_RATE_LIMIT_EXCEEDED]: {
    message: 'Too many AI requests. Please wait a moment before trying again.',
    action: 'Wait and retry'
  },
  [ErrorCode.AI_GENERATION_FAILED]: {
    message: 'Failed to generate AI response. Please try rephrasing your message.',
    action: 'Try rephrasing'
  },
  [ErrorCode.AI_TIMEOUT]: {
    message: 'AI response is taking longer than expected. Please try again.',
    action: 'Try again'
  },
  
  // Payment errors
  [ErrorCode.PAYMENT_FAILED]: {
    message: 'Payment failed. Please check your payment method and try again.',
    action: 'Check payment method'
  },
  [ErrorCode.PAYMENT_CANCELLED]: {
    message: 'Payment was cancelled. You can try again when ready.',
    action: 'Try payment again'
  },
  [ErrorCode.PAYMENT_PROCESSING]: {
    message: 'Payment is being processed. Please wait a moment.',
    action: 'Please wait'
  },
  [ErrorCode.INVALID_PAYMENT_METHOD]: {
    message: 'Invalid payment method. Please use a different payment method.',
    action: 'Use different method'
  },
  
  // Database errors
  [ErrorCode.DATABASE_ERROR]: {
    message: 'A temporary issue occurred. Please try again.',
    action: 'Try again'
  },
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    message: 'The requested item could not be found.',
    action: 'Check and try again'
  },
  [ErrorCode.DUPLICATE_RESOURCE]: {
    message: 'This item already exists.',
    action: 'Use a different name'
  },
  
  // Rate limiting errors
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    message: 'Too many requests. Please slow down and try again.',
    action: 'Wait and retry'
  },
  [ErrorCode.TOO_MANY_REQUESTS]: {
    message: 'You\'re sending requests too quickly. Please wait a moment.',
    action: 'Wait before retrying'
  },
  
  // System errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    message: 'Something went wrong on our end. Please try again.',
    action: 'Try again later'
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    message: 'Service is temporarily unavailable. Please try again later.',
    action: 'Try again later'
  },
  [ErrorCode.MAINTENANCE_MODE]: {
    message: 'VIVK is currently under maintenance. We\'ll be back shortly.',
    action: 'Check back soon'
  },
  [ErrorCode.NETWORK_ERROR]: {
    message: 'Network connection issue. Please check your internet and try again.',
    action: 'Check connection'
  }
}

// Circuit breaker for external services
class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000, // 1 minute
    private readonly successThreshold: number = 2
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new VivkError(
          ErrorCode.SERVICE_UNAVAILABLE,
          'Circuit breaker is open',
          'Service is temporarily unavailable. Please try again later.',
          ErrorSeverity.HIGH,
          true
        )
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }
  
  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
  
  getState(): string {
    return this.state
  }
}

// Global circuit breakers for different services
export const circuitBreakers = {
  ai: new CircuitBreaker(3, 30000, 1), // AI service: 3 failures, 30s timeout
  database: new CircuitBreaker(5, 60000, 2), // Database: 5 failures, 1min timeout
  payment: new CircuitBreaker(3, 120000, 1), // Payment: 3 failures, 2min timeout
}

// Retry logic with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error = new Error('Unknown error')
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain error types
      if (error instanceof VivkError && !error.retryable) {
        throw error
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      )
      
      logSecureError(new Error(`Retry attempt ${attempt + 1}/${maxRetries + 1}`), {
        originalError: error instanceof Error ? error.message : String(error),
        delay
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Enhanced error response builder
export function createErrorResponse(
  error: Error | VivkError,
  context: Record<string, any> = {}
): NextResponse {
  let errorCode: ErrorCode
  let statusCode: number
  let userMessage: string
  let retryable: boolean = false
  let severity: ErrorSeverity = ErrorSeverity.MEDIUM
  
  if (error instanceof VivkError) {
    errorCode = error.code
    userMessage = error.userMessage
    retryable = error.retryable
    severity = error.severity
  } else {
    // Map common errors to appropriate codes
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      errorCode = ErrorCode.UNAUTHORIZED
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      errorCode = ErrorCode.INVALID_INPUT
    } else if (error.message.includes('not found')) {
      errorCode = ErrorCode.RESOURCE_NOT_FOUND
    } else if (error.message.includes('rate limit')) {
      errorCode = ErrorCode.RATE_LIMIT_EXCEEDED
    } else {
      errorCode = ErrorCode.INTERNAL_SERVER_ERROR
    }
    
    const errorInfo = errorMessages[errorCode]
    userMessage = errorInfo.message
  }
  
  // Map error codes to HTTP status codes
  switch (errorCode) {
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.SESSION_EXPIRED:
    case ErrorCode.INVALID_CREDENTIALS:
      statusCode = 401
      break
    case ErrorCode.SUBSCRIPTION_REQUIRED:
    case ErrorCode.SUBSCRIPTION_EXPIRED:
      statusCode = 403
      break
    case ErrorCode.RESOURCE_NOT_FOUND:
      statusCode = 404
      break
    case ErrorCode.INVALID_INPUT:
    case ErrorCode.MISSING_REQUIRED_FIELD:
    case ErrorCode.INVALID_FORMAT:
    case ErrorCode.EMAIL_ALREADY_EXISTS:
    case ErrorCode.DUPLICATE_RESOURCE:
      statusCode = 400
      break
    case ErrorCode.DAILY_LIMIT_REACHED:
    case ErrorCode.RATE_LIMIT_EXCEEDED:
    case ErrorCode.TOO_MANY_REQUESTS:
    case ErrorCode.AI_RATE_LIMIT_EXCEEDED:
      statusCode = 429
      break
    case ErrorCode.PAYMENT_FAILED:
    case ErrorCode.PAYMENT_CANCELLED:
    case ErrorCode.INVALID_PAYMENT_METHOD:
      statusCode = 402
      break
    case ErrorCode.AI_SERVICE_UNAVAILABLE:
    case ErrorCode.SERVICE_UNAVAILABLE:
    case ErrorCode.MAINTENANCE_MODE:
      statusCode = 503
      break
    case ErrorCode.AI_TIMEOUT:
      statusCode = 504
      break
    default:
      statusCode = 500
  }
  
  // Log error securely
  logSecureError(error, {
    ...context,
    errorCode,
    severity,
    statusCode,
    retryable
  })
  
  // Build response
  const response: Record<string, any> = {
    error: userMessage,
    code: errorCode,
    retryable,
    timestamp: new Date().toISOString()
  }
  
  // Add action suggestion if available
  const errorInfo = errorMessages[errorCode]
  if (errorInfo.action) {
    response.action = errorInfo.action
  }
  
  return NextResponse.json(response, { status: statusCode })
}

// Maintenance mode check
let maintenanceMode = false
let maintenanceMessage = 'VIVK is currently under maintenance. We\'ll be back shortly.'

export function setMaintenanceMode(enabled: boolean, message?: string): void {
  maintenanceMode = enabled
  if (message) {
    maintenanceMessage = message
  }
}

export function isMaintenanceMode(): boolean {
  return maintenanceMode
}

export function getMaintenanceMessage(): string {
  return maintenanceMessage
}

// Session expiration handler
export function handleSessionExpiration(): NextResponse {
  return createErrorResponse(
    new VivkError(
      ErrorCode.SESSION_EXPIRED,
      'Session expired',
      'Your session has expired. Please sign in again.',
      ErrorSeverity.LOW,
      false
    )
  )
}

// Database error handler
export function handleDatabaseError(error: Error, operation: string): VivkError {
  logSecureError(error, { operation, type: 'database' })
  
  return new VivkError(
    ErrorCode.DATABASE_ERROR,
    `Database operation failed: ${operation}`,
    'A temporary issue occurred. Please try again.',
    ErrorSeverity.HIGH,
    true
  )
}

// AI service error handler
export function handleAIError(error: Error, context: Record<string, any> = {}): VivkError {
  const errorMessage = error.message.toLowerCase()
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    return new VivkError(
      ErrorCode.AI_RATE_LIMIT_EXCEEDED,
      error.message,
      'Too many AI requests. Please wait a moment before trying again.',
      ErrorSeverity.MEDIUM,
      true,
      context
    )
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('deadline')) {
    return new VivkError(
      ErrorCode.AI_TIMEOUT,
      error.message,
      'AI response is taking longer than expected. Please try again.',
      ErrorSeverity.MEDIUM,
      true,
      context
    )
  }
  
  if (errorMessage.includes('unavailable') || errorMessage.includes('connection')) {
    return new VivkError(
      ErrorCode.AI_SERVICE_UNAVAILABLE,
      error.message,
      'AI service is temporarily unavailable. Please try again in a few moments.',
      ErrorSeverity.HIGH,
      true,
      context
    )
  }
  
  return new VivkError(
    ErrorCode.AI_GENERATION_FAILED,
    error.message,
    'Failed to generate AI response. Please try rephrasing your message.',
    ErrorSeverity.MEDIUM,
    true,
    context
  )
}

// Payment error handler
export function handlePaymentError(error: Error, context: Record<string, any> = {}): VivkError {
  const errorMessage = error.message.toLowerCase()
  
  if (errorMessage.includes('cancelled') || errorMessage.includes('abort')) {
    return new VivkError(
      ErrorCode.PAYMENT_CANCELLED,
      error.message,
      'Payment was cancelled. You can try again when ready.',
      ErrorSeverity.LOW,
      false,
      context
    )
  }
  
  if (errorMessage.includes('invalid') || errorMessage.includes('declined')) {
    return new VivkError(
      ErrorCode.INVALID_PAYMENT_METHOD,
      error.message,
      'Invalid payment method. Please use a different payment method.',
      ErrorSeverity.MEDIUM,
      false,
      context
    )
  }
  
  return new VivkError(
    ErrorCode.PAYMENT_FAILED,
    error.message,
    'Payment failed. Please check your payment method and try again.',
    ErrorSeverity.MEDIUM,
    true,
    context
  )
}

// Global error handler for unhandled errors
export function handleUnexpectedError(error: Error, context: Record<string, any> = {}): VivkError {
  return new VivkError(
    ErrorCode.INTERNAL_SERVER_ERROR,
    error.message,
    'Something went wrong on our end. Please try again.',
    ErrorSeverity.CRITICAL,
    true,
    context
  )
}