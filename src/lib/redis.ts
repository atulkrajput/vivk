// Redis client configuration for caching and rate limiting using Upstash

import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache key prefixes for organization
export const CACHE_KEYS = {
  USER_PROFILE: 'user:profile:',
  USER_USAGE: 'user:usage:',
  CONVERSATION: 'conversation:',
  CONVERSATION_LIST: 'conversations:user:',
  SUBSCRIPTION: 'subscription:user:',
  RATE_LIMIT: 'rate_limit:',
  SESSION: 'session:',
  AI_RESPONSE: 'ai_response:',
  PAYMENT_HISTORY: 'payments:user:',
} as const

// Cache TTL (Time To Live) configurations in seconds
export const CACHE_TTL = {
  USER_PROFILE: 300, // 5 minutes
  USER_USAGE: 60, // 1 minute (frequently updated)
  CONVERSATION: 1800, // 30 minutes
  CONVERSATION_LIST: 300, // 5 minutes
  SUBSCRIPTION: 600, // 10 minutes
  SESSION: 3600, // 1 hour
  AI_RESPONSE: 86400, // 24 hours (for repeated queries)
  PAYMENT_HISTORY: 1800, // 30 minutes
  RATE_LIMIT: 900, // 15 minutes
} as const

// Generic cache operations
export class CacheService {
  /**
   * Get data from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key)
      return data as T | null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Set data in cache with TTL
   */
  static async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await redis.setex(key, ttl, JSON.stringify(value))
      } else {
        await redis.set(key, JSON.stringify(value))
      }
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  /**
   * Delete data from cache
   */
  static async delete(key: string): Promise<boolean> {
    try {
      await redis.del(key)
      return true
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  static async deletePattern(pattern: string): Promise<boolean> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
      return true
    } catch (error) {
      console.error('Cache delete pattern error:', error)
      return false
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  /**
   * Increment a counter (useful for rate limiting)
   */
  static async increment(key: string, ttl?: number): Promise<number> {
    try {
      const count = await redis.incr(key)
      if (ttl && count === 1) {
        await redis.expire(key, ttl)
      }
      return count
    } catch (error) {
      console.error('Cache increment error:', error)
      return 0
    }
  }

  /**
   * Get multiple keys at once
   */
  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await redis.mget(...keys)
      return values.map(value => value as T | null)
    } catch (error) {
      console.error('Cache mget error:', error)
      return keys.map(() => null)
    }
  }

  /**
   * Set multiple keys at once
   */
  static async mset(keyValuePairs: Record<string, any>): Promise<boolean> {
    try {
      const redisObject: Record<string, string> = {}
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        redisObject[key] = JSON.stringify(value)
      })
      await redis.mset(redisObject)
      return true
    } catch (error) {
      console.error('Cache mset error:', error)
      return false
    }
  }
}

// Specialized cache services for different data types

export class UserCacheService {
  /**
   * Cache user profile data
   */
  static async cacheUserProfile(userId: string, profile: any): Promise<void> {
    const key = `${CACHE_KEYS.USER_PROFILE}${userId}`
    await CacheService.set(key, profile, CACHE_TTL.USER_PROFILE)
  }

  /**
   * Get cached user profile
   */
  static async getUserProfile(userId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.USER_PROFILE}${userId}`
    return await CacheService.get(key)
  }

  /**
   * Invalidate user profile cache
   */
  static async invalidateUserProfile(userId: string): Promise<void> {
    const key = `${CACHE_KEYS.USER_PROFILE}${userId}`
    await CacheService.delete(key)
  }

  /**
   * Cache user usage data
   */
  static async cacheUserUsage(userId: string, usage: any): Promise<void> {
    const key = `${CACHE_KEYS.USER_USAGE}${userId}`
    await CacheService.set(key, usage, CACHE_TTL.USER_USAGE)
  }

  /**
   * Get cached user usage
   */
  static async getUserUsage(userId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.USER_USAGE}${userId}`
    return await CacheService.get(key)
  }

  /**
   * Invalidate user usage cache
   */
  static async invalidateUserUsage(userId: string): Promise<void> {
    const key = `${CACHE_KEYS.USER_USAGE}${userId}`
    await CacheService.delete(key)
  }
}

export class ConversationCacheService {
  /**
   * Cache conversation data
   */
  static async cacheConversation(conversationId: string, conversation: any): Promise<void> {
    const key = `${CACHE_KEYS.CONVERSATION}${conversationId}`
    await CacheService.set(key, conversation, CACHE_TTL.CONVERSATION)
  }

  /**
   * Get cached conversation
   */
  static async getConversation(conversationId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.CONVERSATION}${conversationId}`
    return await CacheService.get(key)
  }

  /**
   * Cache user's conversation list
   */
  static async cacheConversationList(userId: string, conversations: any[]): Promise<void> {
    const key = `${CACHE_KEYS.CONVERSATION_LIST}${userId}`
    await CacheService.set(key, conversations, CACHE_TTL.CONVERSATION_LIST)
  }

  /**
   * Get cached conversation list
   */
  static async getConversationList(userId: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.CONVERSATION_LIST}${userId}`
    return await CacheService.get(key)
  }

  /**
   * Invalidate conversation caches for a user
   */
  static async invalidateUserConversations(userId: string): Promise<void> {
    const listKey = `${CACHE_KEYS.CONVERSATION_LIST}${userId}`
    await CacheService.delete(listKey)
    
    // Also invalidate individual conversation caches if needed
    // This would require tracking which conversations belong to which user
  }

  /**
   * Invalidate specific conversation cache
   */
  static async invalidateConversation(conversationId: string): Promise<void> {
    const key = `${CACHE_KEYS.CONVERSATION}${conversationId}`
    await CacheService.delete(key)
  }
}

export class RateLimitService {
  /**
   * Check and increment rate limit counter
   */
  static async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `${CACHE_KEYS.RATE_LIMIT}${identifier}`
    
    try {
      const current = await CacheService.increment(key, windowSeconds)
      const remaining = Math.max(0, limit - current)
      const allowed = current <= limit
      const resetTime = Date.now() + (windowSeconds * 1000)
      
      return { allowed, remaining, resetTime }
    } catch (error) {
      console.error('Rate limit check error:', error)
      // Fail open - allow the request if Redis is down
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + (windowSeconds * 1000) }
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  static async resetRateLimit(identifier: string): Promise<void> {
    const key = `${CACHE_KEYS.RATE_LIMIT}${identifier}`
    await CacheService.delete(key)
  }
}

export class SessionCacheService {
  /**
   * Cache session data
   */
  static async cacheSession(sessionId: string, sessionData: any): Promise<void> {
    const key = `${CACHE_KEYS.SESSION}${sessionId}`
    await CacheService.set(key, sessionData, CACHE_TTL.SESSION)
  }

  /**
   * Get cached session
   */
  static async getSession(sessionId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.SESSION}${sessionId}`
    return await CacheService.get(key)
  }

  /**
   * Invalidate session cache
   */
  static async invalidateSession(sessionId: string): Promise<void> {
    const key = `${CACHE_KEYS.SESSION}${sessionId}`
    await CacheService.delete(key)
  }

  /**
   * Extend session TTL
   */
  static async extendSession(sessionId: string): Promise<void> {
    const key = `${CACHE_KEYS.SESSION}${sessionId}`
    const sessionData = await CacheService.get(key)
    if (sessionData) {
      await CacheService.set(key, sessionData, CACHE_TTL.SESSION)
    }
  }
}

// AI Response caching for repeated queries
export class AICacheService {
  /**
   * Generate cache key for AI response based on conversation context
   */
  private static generateCacheKey(messages: any[], model: string): string {
    // Create a hash of the conversation context
    const contextString = JSON.stringify({ messages: messages.slice(-5), model }) // Last 5 messages
    const hash = Buffer.from(contextString).toString('base64').slice(0, 32)
    return `${CACHE_KEYS.AI_RESPONSE}${hash}`
  }

  /**
   * Cache AI response
   */
  static async cacheAIResponse(
    messages: any[],
    model: string,
    response: string
  ): Promise<void> {
    const key = this.generateCacheKey(messages, model)
    await CacheService.set(key, { response, timestamp: Date.now() }, CACHE_TTL.AI_RESPONSE)
  }

  /**
   * Get cached AI response
   */
  static async getCachedAIResponse(
    messages: any[],
    model: string
  ): Promise<string | null> {
    const key = this.generateCacheKey(messages, model)
    const cached = await CacheService.get<{ response: string; timestamp: number }>(key)
    
    if (cached) {
      // Check if cache is still fresh (within 1 hour for exact matches)
      const isRecent = Date.now() - cached.timestamp < 3600000 // 1 hour
      if (isRecent) {
        return cached.response
      }
    }
    
    return null
  }
}

// Health check for Redis connection
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping()
    return true
  } catch (error) {
    console.error('Redis health check failed:', error)
    return false
  }
}

export { redis }
export default CacheService