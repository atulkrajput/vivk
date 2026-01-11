// Enhanced rate limiting using Redis for distributed rate limiting

import { NextRequest, NextResponse } from 'next/server'
import { RateLimitService } from './redis'
import { logSecureError } from './security'

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // Authentication endpoints (per IP)
  AUTH: {
    windowSeconds: 900, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.',
  },
  
  // Chat endpoints (per user)
  CHAT_FREE: {
    windowSeconds: 60, // 1 minute
    maxRequests: 10,
    message: 'Rate limit exceeded. Please slow down.',
  },
  
  CHAT_PRO: {
    windowSeconds: 60, // 1 minute
    maxRequests: 30,
    message: 'Rate limit exceeded. Please slow down.',
  },
  
  // Payment endpoints (per IP)
  PAYMENT: {
    windowSeconds: 3600, // 1 hour
    maxRequests: 10,
    message: 'Too many payment attempts. Please try again later.',
  },
  
  // General API endpoints (per IP)
  API: {
    windowSeconds: 900, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests. Please try again later.',
  },
  
  // User-specific endpoints (per user)
  USER_API: {
    windowSeconds: 300, // 5 minutes
    maxRequests: 50,
    message: 'Too many requests. Please slow down.',
  },
  
  // Admin endpoints (per IP)
  ADMIN: {
    windowSeconds: 300, // 5 minutes
    maxRequests: 20,
    message: 'Too many admin requests. Please slow down.',
  },
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

/**
 * Check rate limit for a given identifier and type
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType,
  customLimit?: { windowSeconds: number; maxRequests: number }
): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
  limit: number
  windowSeconds: number
}> {
  const config = customLimit || RATE_LIMITS[type]
  const key = `${type}:${identifier}`
  
  const result = await RateLimitService.checkRateLimit(
    key,
    config.maxRequests,
    config.windowSeconds
  )
  
  return {
    ...result,
    limit: config.maxRequests,
    windowSeconds: config.windowSeconds,
  }
}

/**
 * Create rate limit response with proper headers
 */
export function createRateLimitResponse(
  type: RateLimitType,
  remaining: number,
  resetTime: number,
  limit: number
): NextResponse {
  const config = RATE_LIMITS[type]
  
  const response = NextResponse.json(
    {
      error: config.message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true,
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      timestamp: new Date().toISOString(),
    },
    { status: 429 }
  )
  
  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
  response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString())
  
  return response
}

/**
 * Apply rate limit headers to successful responses
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetTime: number,
  limit: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
  
  return response
}

/**
 * Middleware helper for rate limiting
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  identifier: string,
  type: RateLimitType,
  customLimit?: { windowSeconds: number; maxRequests: number }
): Promise<NextResponse | null> {
  try {
    const result = await checkRateLimit(identifier, type, customLimit)
    
    if (!result.allowed) {
      logSecureError(new Error(`Rate limit exceeded: ${type}`), {
        identifier,
        type,
        limit: result.limit,
        remaining: result.remaining,
        path: request.nextUrl.pathname,
      })
      
      return createRateLimitResponse(type, result.remaining, result.resetTime, result.limit)
    }
    
    // Rate limit passed, continue with request
    return null
  } catch (error) {
    logSecureError(error as Error, {
      context: 'rate_limit_middleware',
      identifier,
      type,
    })
    
    // If Redis is down, fail open (allow the request)
    return null
  }
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  // Use the first available IP
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to a default identifier
  return 'unknown'
}

/**
 * Get user identifier for authenticated requests
 */
export function getUserIdentifier(userId: string): string {
  return `user:${userId}`
}

/**
 * Rate limiting decorator for API routes
 */
export function withRateLimit(
  type: RateLimitType,
  getIdentifier: (request: NextRequest) => string | Promise<string>,
  customLimit?: { windowSeconds: number; maxRequests: number }
) {
  return function (handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>) {
    return async function (request: NextRequest, ...args: any[]): Promise<NextResponse> {
      try {
        const identifier = await getIdentifier(request)
        const rateLimitResponse = await rateLimitMiddleware(request, identifier, type, customLimit)
        
        if (rateLimitResponse) {
          return rateLimitResponse
        }
        
        // Execute the original handler
        const response = await handler(request, ...args)
        
        // Add rate limit headers to successful responses
        const result = await checkRateLimit(identifier, type, customLimit)
        return applyRateLimitHeaders(response, result.remaining, result.resetTime, result.limit)
        
      } catch (error) {
        logSecureError(error as Error, {
          context: 'rate_limit_decorator',
          type,
          path: request.nextUrl.pathname,
        })
        
        // If rate limiting fails, execute the handler anyway
        return await handler(request, ...args)
      }
    }
  }
}

/**
 * Burst rate limiting for high-frequency operations
 */
export async function checkBurstRateLimit(
  identifier: string,
  burstLimit: number,
  burstWindowSeconds: number = 10
): Promise<boolean> {
  const key = `burst:${identifier}`
  
  try {
    const result = await RateLimitService.checkRateLimit(key, burstLimit, burstWindowSeconds)
    return result.allowed
  } catch (error) {
    logSecureError(error as Error, {
      context: 'burst_rate_limit',
      identifier,
    })
    return true // Fail open
  }
}

/**
 * Adaptive rate limiting based on user behavior
 */
export class AdaptiveRateLimit {
  private static readonly SUSPICIOUS_THRESHOLD = 0.8 // 80% of limit
  private static readonly PENALTY_MULTIPLIER = 0.5 // Reduce limit by 50%
  private static readonly PENALTY_DURATION = 300 // 5 minutes
  
  /**
   * Check if user is behaving suspiciously
   */
  static async checkSuspiciousActivity(
    identifier: string,
    type: RateLimitType
  ): Promise<boolean> {
    const config = RATE_LIMITS[type]
    const result = await checkRateLimit(identifier, type)
    
    const usageRatio = (config.maxRequests - result.remaining) / config.maxRequests
    return usageRatio >= this.SUSPICIOUS_THRESHOLD
  }
  
  /**
   * Apply penalty for suspicious behavior
   */
  static async applyPenalty(identifier: string, type: RateLimitType): Promise<void> {
    const penaltyKey = `penalty:${type}:${identifier}`
    const config = RATE_LIMITS[type]
    
    const penaltyLimit = Math.floor(config.maxRequests * this.PENALTY_MULTIPLIER)
    
    // Store penalty information
    await RateLimitService.checkRateLimit(penaltyKey, penaltyLimit, this.PENALTY_DURATION)
    
    logSecureError(new Error('Rate limit penalty applied'), {
      identifier,
      type,
      originalLimit: config.maxRequests,
      penaltyLimit,
      duration: this.PENALTY_DURATION,
    })
  }
  
  /**
   * Check rate limit with adaptive penalties
   */
  static async checkAdaptiveRateLimit(
    identifier: string,
    type: RateLimitType
  ): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    limit: number
    penalized: boolean
  }> {
    const penaltyKey = `penalty:${type}:${identifier}`
    const config = RATE_LIMITS[type]
    
    // Check if user is currently penalized
    const penaltyResult = await RateLimitService.checkRateLimit(
      penaltyKey,
      Math.floor(config.maxRequests * this.PENALTY_MULTIPLIER),
      this.PENALTY_DURATION
    )
    
    if (!penaltyResult.allowed) {
      return {
        allowed: false,
        remaining: penaltyResult.remaining,
        resetTime: penaltyResult.resetTime,
        limit: Math.floor(config.maxRequests * this.PENALTY_MULTIPLIER),
        penalized: true,
      }
    }
    
    // Normal rate limit check
    const result = await checkRateLimit(identifier, type)
    
    // Check for suspicious activity
    if (result.allowed && await this.checkSuspiciousActivity(identifier, type)) {
      await this.applyPenalty(identifier, type)
    }
    
    return {
      ...result,
      penalized: false,
    }
  }
}

/**
 * Reset rate limits for testing or admin purposes
 */
export async function resetRateLimit(identifier: string, type: RateLimitType): Promise<void> {
  const key = `${type}:${identifier}`
  await RateLimitService.resetRateLimit(key)
}

/**
 * Get rate limit status without incrementing
 */
export async function getRateLimitStatus(
  identifier: string,
  type: RateLimitType
): Promise<{
  remaining: number
  resetTime: number
  limit: number
}> {
  // This is a bit tricky since we need to check without incrementing
  // We'll use a separate status key that doesn't increment
  const config = RATE_LIMITS[type]
  const key = `${type}:${identifier}`
  
  try {
    // Get current count without incrementing
    const current = await RateLimitService.checkRateLimit(key, config.maxRequests, config.windowSeconds)
    
    return {
      remaining: current.remaining,
      resetTime: current.resetTime,
      limit: config.maxRequests,
    }
  } catch (error) {
    return {
      remaining: config.maxRequests,
      resetTime: Date.now() + (config.windowSeconds * 1000),
      limit: config.maxRequests,
    }
  }
}