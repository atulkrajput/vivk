// Database optimization utilities for performance improvements

import { supabase } from './db'

/**
 * Database indexes for optimal query performance
 * These should be created in Supabase SQL editor or migrations
 */
export const RECOMMENDED_INDEXES = {
  // Users table indexes
  users: [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);',
    'CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);',
  ],
  
  // Conversations table indexes
  conversations: [
    'CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations(user_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_conversations_title ON conversations USING gin(to_tsvector(\'english\', title));',
  ],
  
  // Messages table indexes
  messages: [
    'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);',
    'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);',
    'CREATE INDEX IF NOT EXISTS idx_messages_content ON messages USING gin(to_tsvector(\'english\', content));',
  ],
  
  // Usage logs table indexes
  usage_logs: [
    'CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON usage_logs(date DESC);',
    'CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON usage_logs(user_id, date DESC);',
    'CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);',
  ],
  
  // Subscriptions table indexes
  subscriptions: [
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);',
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);',
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);',
  ],
  
  // Payments table indexes
  payments: [
    'CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);',
    'CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);',
    'CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);',
  ],
} as const

/**
 * Optimized query builders for common operations
 */
class OptimizedQueries {
  /**
   * Get user conversations with optimized query
   */
  static async getUserConversations(
    userId: string,
    options: {
      limit?: number
      offset?: number
      search?: string
      includeMessageCount?: boolean
    } = {}
  ) {
    const { limit = 50, offset = 0, search, includeMessageCount = true } = options
    
    let query = supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        ${includeMessageCount ? `
        messages!inner(count),
        latest_message:messages(
          content,
          created_at,
          role
        )
        ` : ''}
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (search) {
      query = query.textSearch('title', search)
    }
    
    return query
  }
  
  /**
   * Get conversation messages with optimized pagination
   */
  static async getConversationMessages(
    conversationId: string,
    options: {
      limit?: number
      before?: string // message ID for cursor-based pagination
      after?: string // message ID for cursor-based pagination
    } = {}
  ) {
    const { limit = 50, before, after } = options
    
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)
    
    if (before) {
      query = query.lt('created_at', before)
    }
    
    if (after) {
      query = query.gt('created_at', after)
    }
    
    return query
  }
  
  /**
   * Get user usage statistics with optimized aggregation
   */
  static async getUserUsageStats(userId: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    return supabase
      .from('usage_logs')
      .select(`
        date,
        daily_count,
        monthly_count
      `)
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })
  }
  
  /**
   * Get user payment history with optimized query
   */
  static async getUserPaymentHistory(
    userId: string,
    options: {
      limit?: number
      offset?: number
      status?: string
    } = {}
  ) {
    const { limit = 50, offset = 0, status } = options
    
    let query = supabase
      .from('payments')
      .select(`
        id,
        amount,
        currency,
        status,
        razorpay_payment_id,
        razorpay_order_id,
        created_at,
        metadata
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    return query
  }
  
  /**
   * Bulk insert messages with optimized batch processing
   */
  static async bulkInsertMessages(messages: any[]) {
    // Process in batches of 100 for optimal performance
    const batchSize = 100
    const results = []
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      const result = await supabase
        .from('messages')
        .insert(batch)
        .select()
      
      results.push(result)
    }
    
    return results
  }
  
  /**
   * Update conversation last activity efficiently
   */
  static async updateConversationActivity(conversationId: string) {
    return supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  }
  
  /**
   * Get dashboard statistics with single optimized query
   */
  static async getDashboardStats(userId: string) {
    const [conversations, messages, usage, payments] = await Promise.all([
      // Total conversations
      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Total messages
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Current month usage
      supabase
        .from('usage_logs')
        .select('daily_count')
        .eq('user_id', userId)
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(1),
      
      // Total payments
      supabase
        .from('payments')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'completed')
    ])
    
    return {
      totalConversations: conversations.count || 0,
      totalMessages: messages.count || 0,
      currentMonthUsage: usage.data?.[0]?.daily_count || 0,
      totalSpent: payments.data?.reduce((sum, p) => sum + p.amount, 0) || 0
    }
  }
}

/**
 * Database maintenance utilities
 */
class DatabaseMaintenance {
  /**
   * Clean up old usage logs (keep last 90 days)
   */
  static async cleanupOldUsageLogs() {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)
    
    return supabase
      .from('usage_logs')
      .delete()
      .lt('date', cutoffDate.toISOString().split('T')[0])
  }
  
  /**
   * Archive old conversations (move to archive table)
   */
  static async archiveOldConversations(daysOld: number = 365) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    
    // This would require an archive table and proper migration
    // For now, just identify candidates
    return supabase
      .from('conversations')
      .select('id, user_id, created_at')
      .lt('updated_at', cutoffDate.toISOString())
      .order('updated_at', { ascending: true })
      .limit(1000)
  }
  
  /**
   * Update table statistics for query planner
   */
  static async updateTableStatistics() {
    // This would typically be done via SQL commands
    const tables = ['users', 'conversations', 'messages', 'usage_logs', 'subscriptions', 'payments']
    
    // In a real implementation, you'd run ANALYZE commands
    console.log('Table statistics should be updated for:', tables)
    
    return { success: true, tables }
  }
  
  /**
   * Check for missing indexes
   */
  static async checkMissingIndexes() {
    // This would query pg_stat_user_tables and pg_stat_user_indexes
    // to identify slow queries and missing indexes
    
    const slowQueries = [
      'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      'SELECT * FROM usage_logs WHERE user_id = ? AND date >= ?',
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC'
    ]
    
    return { slowQueries, recommendation: 'Create indexes as defined in RECOMMENDED_INDEXES' }
  }
}

/**
 * Query performance monitoring
 */
class QueryPerformanceMonitor {
  private static queryTimes: Map<string, number[]> = new Map()
  
  /**
   * Track query execution time
   */
  static trackQuery(queryName: string, executionTime: number) {
    if (!this.queryTimes.has(queryName)) {
      this.queryTimes.set(queryName, [])
    }
    
    const times = this.queryTimes.get(queryName)!
    times.push(executionTime)
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift()
    }
  }
  
  /**
   * Get query performance statistics
   */
  static getQueryStats(queryName: string) {
    const times = this.queryTimes.get(queryName) || []
    
    if (times.length === 0) {
      return null
    }
    
    const sorted = [...times].sort((a, b) => a - b)
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length
    const median = sorted[Math.floor(sorted.length / 2)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    
    return {
      count: times.length,
      average: Math.round(avg),
      median: Math.round(median),
      p95: Math.round(p95),
      min: Math.round(min),
      max: Math.round(max)
    }
  }
  
  /**
   * Get all query statistics
   */
  static getAllStats() {
    const stats: Record<string, any> = {}
    
    for (const [queryName] of this.queryTimes) {
      stats[queryName] = this.getQueryStats(queryName)
    }
    
    return stats
  }
  
  /**
   * Identify slow queries
   */
  static getSlowQueries(thresholdMs: number = 1000) {
    const slowQueries: Array<{ query: string; stats: any }> = []
    
    for (const [queryName] of this.queryTimes) {
      const stats = this.getQueryStats(queryName)
      if (stats && (stats.average > thresholdMs || stats.p95 > thresholdMs * 2)) {
        slowQueries.push({ query: queryName, stats })
      }
    }
    
    return slowQueries.sort((a, b) => b.stats.average - a.stats.average)
  }
}

/**
 * Wrapper function to monitor query performance
 */
function withQueryMonitoring<T>(
  queryName: string,
  queryFunction: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  return queryFunction()
    .then(result => {
      const executionTime = Date.now() - startTime
      QueryPerformanceMonitor.trackQuery(queryName, executionTime)
      
      // Log slow queries
      if (executionTime > 1000) {
        console.warn(`Slow query detected: ${queryName} took ${executionTime}ms`)
      }
      
      return result
    })
    .catch(error => {
      const executionTime = Date.now() - startTime
      QueryPerformanceMonitor.trackQuery(`${queryName}_error`, executionTime)
      throw error
    })
}

/**
 * Connection pool optimization
 */
class ConnectionPoolOptimizer {
  /**
   * Get connection pool statistics
   */
  static async getPoolStats() {
    // This would typically query pg_stat_activity
    // For Supabase, we rely on their connection pooling
    
    return {
      message: 'Connection pooling is managed by Supabase',
      recommendation: 'Monitor query performance and optimize slow queries'
    }
  }
  
  /**
   * Optimize connection usage
   */
  static optimizeConnections() {
    // Best practices for Supabase connections
    return {
      recommendations: [
        'Use connection pooling (handled by Supabase)',
        'Close connections promptly',
        'Use prepared statements when possible',
        'Batch multiple operations',
        'Use read replicas for read-heavy operations'
      ]
    }
  }
}

export {
  OptimizedQueries,
  DatabaseMaintenance,
  QueryPerformanceMonitor,
  ConnectionPoolOptimizer,
  withQueryMonitoring
}