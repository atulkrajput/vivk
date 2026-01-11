// Cache invalidation strategies for maintaining data consistency

import { 
  CacheService, 
  UserCacheService, 
  ConversationCacheService,
  CACHE_KEYS 
} from './redis'
import { logSecureError } from './security'

/**
 * Cache invalidation patterns
 */
export enum InvalidationPattern {
  USER_PROFILE = 'user_profile',
  USER_USAGE = 'user_usage',
  USER_CONVERSATIONS = 'user_conversations',
  CONVERSATION = 'conversation',
  PAYMENT_HISTORY = 'payment_history',
  SUBSCRIPTION = 'subscription',
  ALL_USER_DATA = 'all_user_data'
}

/**
 * Cache invalidation service
 */
class CacheInvalidationService {
  /**
   * Invalidate cache based on pattern
   */
  static async invalidate(pattern: InvalidationPattern, identifier: string): Promise<void> {
    try {
      switch (pattern) {
        case InvalidationPattern.USER_PROFILE:
          await UserCacheService.invalidateUserProfile(identifier)
          break
          
        case InvalidationPattern.USER_USAGE:
          await UserCacheService.invalidateUserUsage(identifier)
          break
          
        case InvalidationPattern.USER_CONVERSATIONS:
          await ConversationCacheService.invalidateUserConversations(identifier)
          break
          
        case InvalidationPattern.CONVERSATION:
          await ConversationCacheService.invalidateConversation(identifier)
          break
          
        case InvalidationPattern.PAYMENT_HISTORY:
          await CacheService.delete(`${CACHE_KEYS.PAYMENT_HISTORY}${identifier}`)
          break
          
        case InvalidationPattern.SUBSCRIPTION:
          await CacheService.delete(`${CACHE_KEYS.SUBSCRIPTION}${identifier}`)
          break
          
        case InvalidationPattern.ALL_USER_DATA:
          await this.invalidateAllUserData(identifier)
          break
      }
    } catch (error) {
      logSecureError(error as Error, {
        context: 'cache_invalidation',
        pattern,
        identifier
      })
    }
  }
  
  /**
   * Invalidate all user-related cache data
   */
  private static async invalidateAllUserData(userId: string): Promise<void> {
    const patterns = [
      `${CACHE_KEYS.USER_PROFILE}${userId}`,
      `${CACHE_KEYS.USER_USAGE}${userId}`,
      `${CACHE_KEYS.CONVERSATION_LIST}${userId}`,
      `${CACHE_KEYS.SUBSCRIPTION}${userId}`,
      `${CACHE_KEYS.PAYMENT_HISTORY}${userId}`
    ]
    
    await Promise.all(patterns.map(pattern => CacheService.delete(pattern)))
  }
  
  /**
   * Invalidate cache with dependencies
   */
  static async invalidateWithDependencies(
    pattern: InvalidationPattern, 
    identifier: string,
    dependencies?: Array<{ pattern: InvalidationPattern; identifier: string }>
  ): Promise<void> {
    // Invalidate primary cache
    await this.invalidate(pattern, identifier)
    
    // Invalidate dependent caches
    if (dependencies) {
      await Promise.all(
        dependencies.map(dep => this.invalidate(dep.pattern, dep.identifier))
      )
    }
  }
  
  /**
   * Batch invalidation for multiple patterns
   */
  static async batchInvalidate(
    invalidations: Array<{ pattern: InvalidationPattern; identifier: string }>
  ): Promise<void> {
    await Promise.all(
      invalidations.map(({ pattern, identifier }) => this.invalidate(pattern, identifier))
    )
  }
  
  /**
   * Scheduled cache cleanup
   */
  static async scheduledCleanup(): Promise<void> {
    try {
      // Clean up expired keys (Redis handles this automatically, but we can force it)
      const patterns = Object.values(CACHE_KEYS).map(key => `${key}*`)
      
      for (const pattern of patterns) {
        const keys = await CacheService.get<string[]>(`keys:${pattern}`) || []
        
        // Check each key's TTL and remove expired ones
        for (const key of keys) {
          const exists = await CacheService.exists(key)
          if (!exists) {
            // Key has expired, remove from tracking
            continue
          }
        }
      }
    } catch (error) {
      logSecureError(error as Error, {
        context: 'scheduled_cache_cleanup'
      })
    }
  }
}

/**
 * Cache warming strategies
 */
class CacheWarmingService {
  /**
   * Warm user cache after login
   */
  static async warmUserCache(userId: string): Promise<void> {
    try {
      // This would typically fetch and cache frequently accessed user data
      // Implementation depends on your specific data access patterns
      
      // Example: Pre-load user profile, recent conversations, usage stats
      const warmingTasks: Promise<void>[] = [
        // User profile would be loaded from database and cached
        // Recent conversations would be loaded and cached
        // Usage statistics would be calculated and cached
      ]
      
      await Promise.allSettled(warmingTasks)
    } catch (error) {
      logSecureError(error as Error, {
        context: 'cache_warming',
        userId
      })
    }
  }
  
  /**
   * Warm frequently accessed data
   */
  static async warmFrequentData(): Promise<void> {
    try {
      // Warm caches for frequently accessed data
      // This could be run periodically or triggered by specific events
      
      // Example: Popular conversations, common AI responses, etc.
    } catch (error) {
      logSecureError(error as Error, {
        context: 'frequent_data_warming'
      })
    }
  }
}

/**
 * Cache consistency checker
 */
class CacheConsistencyChecker {
  /**
   * Check cache consistency for a user
   */
  static async checkUserCacheConsistency(userId: string): Promise<{
    consistent: boolean
    issues: string[]
  }> {
    const issues: string[] = []
    
    try {
      // Check if cached data matches database data
      // This is a simplified example - in practice, you'd compare specific fields
      
      const cachedProfile = await UserCacheService.getUserProfile(userId)
      const cachedUsage = await UserCacheService.getUserUsage(userId)
      const cachedConversations = await ConversationCacheService.getConversationList(userId)
      
      // Perform consistency checks
      if (cachedProfile && !this.isValidProfileData(cachedProfile)) {
        issues.push('Invalid cached profile data')
      }
      
      if (cachedUsage && !this.isValidUsageData(cachedUsage)) {
        issues.push('Invalid cached usage data')
      }
      
      if (cachedConversations && !this.isValidConversationData(cachedConversations)) {
        issues.push('Invalid cached conversation data')
      }
      
      return {
        consistent: issues.length === 0,
        issues
      }
    } catch (error) {
      logSecureError(error as Error, {
        context: 'cache_consistency_check',
        userId
      })
      
      return {
        consistent: false,
        issues: ['Cache consistency check failed']
      }
    }
  }
  
  private static isValidProfileData(data: any): boolean {
    return data && typeof data === 'object' && data.id && data.email
  }
  
  private static isValidUsageData(data: any): boolean {
    return data && typeof data === 'object' && typeof data.usage === 'object'
  }
  
  private static isValidConversationData(data: any): boolean {
    return Array.isArray(data) && data.every(conv => conv.id && conv.title)
  }
  
  /**
   * Fix cache inconsistencies
   */
  static async fixInconsistencies(userId: string): Promise<void> {
    try {
      // Invalidate all user cache to force fresh data load
      await CacheInvalidationService.invalidate(InvalidationPattern.ALL_USER_DATA, userId)
      
      // Optionally warm the cache with fresh data
      await CacheWarmingService.warmUserCache(userId)
    } catch (error) {
      logSecureError(error as Error, {
        context: 'cache_inconsistency_fix',
        userId
      })
    }
  }
}

/**
 * Cache event handlers for automatic invalidation
 */
class CacheEventHandlers {
  /**
   * Handle user profile update
   */
  static async onUserProfileUpdate(userId: string): Promise<void> {
    await CacheInvalidationService.invalidate(InvalidationPattern.USER_PROFILE, userId)
  }
  
  /**
   * Handle user usage update
   */
  static async onUserUsageUpdate(userId: string): Promise<void> {
    await CacheInvalidationService.invalidate(InvalidationPattern.USER_USAGE, userId)
  }
  
  /**
   * Handle conversation creation
   */
  static async onConversationCreate(userId: string, conversationId: string): Promise<void> {
    await CacheInvalidationService.invalidateWithDependencies(
      InvalidationPattern.USER_CONVERSATIONS,
      userId,
      [
        { pattern: InvalidationPattern.CONVERSATION, identifier: conversationId }
      ]
    )
  }
  
  /**
   * Handle conversation update
   */
  static async onConversationUpdate(userId: string, conversationId: string): Promise<void> {
    await CacheInvalidationService.invalidateWithDependencies(
      InvalidationPattern.CONVERSATION,
      conversationId,
      [
        { pattern: InvalidationPattern.USER_CONVERSATIONS, identifier: userId }
      ]
    )
  }
  
  /**
   * Handle message creation
   */
  static async onMessageCreate(userId: string, conversationId: string): Promise<void> {
    await CacheInvalidationService.batchInvalidate([
      { pattern: InvalidationPattern.CONVERSATION, identifier: conversationId },
      { pattern: InvalidationPattern.USER_CONVERSATIONS, identifier: userId },
      { pattern: InvalidationPattern.USER_USAGE, identifier: userId }
    ])
  }
  
  /**
   * Handle payment completion
   */
  static async onPaymentComplete(userId: string): Promise<void> {
    await CacheInvalidationService.batchInvalidate([
      { pattern: InvalidationPattern.PAYMENT_HISTORY, identifier: userId },
      { pattern: InvalidationPattern.SUBSCRIPTION, identifier: userId },
      { pattern: InvalidationPattern.USER_PROFILE, identifier: userId }
    ])
  }
  
  /**
   * Handle subscription change
   */
  static async onSubscriptionChange(userId: string): Promise<void> {
    await CacheInvalidationService.batchInvalidate([
      { pattern: InvalidationPattern.SUBSCRIPTION, identifier: userId },
      { pattern: InvalidationPattern.USER_PROFILE, identifier: userId },
      { pattern: InvalidationPattern.USER_USAGE, identifier: userId }
    ])
  }
}

/**
 * Cache metrics and monitoring
 */
class CacheMetrics {
  private static hitCount = 0
  private static missCount = 0
  private static errorCount = 0
  
  /**
   * Record cache hit
   */
  static recordHit(key: string): void {
    this.hitCount++
    // Could also record per-key metrics
  }
  
  /**
   * Record cache miss
   */
  static recordMiss(key: string): void {
    this.missCount++
    // Could also record per-key metrics
  }
  
  /**
   * Record cache error
   */
  static recordError(key: string, error: Error): void {
    this.errorCount++
    logSecureError(error, {
      context: 'cache_error',
      key
    })
  }
  
  /**
   * Get cache statistics
   */
  static getStats(): {
    hits: number
    misses: number
    errors: number
    hitRate: number
    totalRequests: number
  } {
    const totalRequests = this.hitCount + this.missCount
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0
    
    return {
      hits: this.hitCount,
      misses: this.missCount,
      errors: this.errorCount,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests
    }
  }
  
  /**
   * Reset statistics
   */
  static resetStats(): void {
    this.hitCount = 0
    this.missCount = 0
    this.errorCount = 0
  }
}

export {
  CacheInvalidationService,
  CacheWarmingService,
  CacheConsistencyChecker,
  CacheEventHandlers,
  CacheMetrics
}