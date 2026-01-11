import { createClient } from '@supabase/supabase-js'
import type {
  User,
  Conversation,
  Message,
  UsageLog,
  Subscription,
  Payment,
  UserInsert,
  ConversationInsert,
  MessageInsert,
  UsageLogInsert,
  SubscriptionInsert,
  PaymentInsert,
  UserUpdate,
  ConversationUpdate,
  MessageUpdate,
  UsageLogUpdate,
  SubscriptionUpdate,
  PaymentUpdate,
  ConversationWithMessageCount,
  UserWithSubscription,
  MessageWithConversation
} from '@/types/database.types'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database connection test
export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count').limit(1)
    return !error
  } catch {
    return false
  }
}

// User operations
export const userDb = {
  // Create new user
  async create(userData: UserInsert): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating user:', error)
      return null
    }
    return data
  },

  // Get user by ID
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching user by ID:', error)
      return null
    }
    return data
  },

  // Get user by email
  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error) {
      console.error('Error fetching user by email:', error)
      return null
    }
    return data
  },

  // Update user
  async update(id: string, updates: UserUpdate): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating user:', error)
      return null
    }
    return data
  },

  // Get user with subscription details
  async getWithSubscription(id: string): Promise<UserWithSubscription | null> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        subscriptions!inner(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching user with subscription:', error)
      return null
    }
    
    return {
      ...data,
      subscription: data.subscriptions?.[0] || undefined
    }
  }
}

// Conversation operations
export const conversationDb = {
  // Create new conversation
  async create(conversationData: ConversationInsert): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating conversation:', error)
      return null
    }
    return data
  },

  // Get conversation by ID
  async getById(id: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching conversation:', error)
      return null
    }
    return data
  },

  // Get all conversations for a user
  async getByUserId(userId: string, options?: {
    search?: string
    limit?: number
    offset?: number
  }): Promise<ConversationWithMessageCount[]> {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        messages(content, created_at)
      `)
      .eq('user_id', userId)

    // Add search filter if provided
    if (options?.search) {
      query = query.ilike('title', `%${options.search}%`)
    }

    // Add pagination
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.range(options.offset, (options.offset || 0) + (options.limit || 50) - 1)
    }

    // Order by most recent activity
    query = query.order('updated_at', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching user conversations:', error)
      return []
    }
    
    return data.map(conv => ({
      ...conv,
      message_count: conv.messages?.length || 0,
      last_message: conv.messages?.[conv.messages.length - 1]?.content?.substring(0, 100) || null,
      last_activity: conv.messages?.[conv.messages.length - 1]?.created_at || conv.created_at
    }))
  },

  // Update conversation
  async update(id: string, updates: ConversationUpdate): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating conversation:', error)
      return null
    }
    return data
  },

  // Delete conversation
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting conversation:', error)
      return false
    }
    return true
  }
}

// Message operations
export const messageDb = {
  // Create new message
  async create(messageData: MessageInsert): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating message:', error)
      return null
    }
    return data
  },

  // Get messages by conversation ID
  async getByConversationId(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }
    return data
  },

  // Get messages with conversation details
  async getWithConversation(conversationId: string): Promise<MessageWithConversation[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        conversations!inner(id, title, user_id)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching messages with conversation:', error)
      return []
    }
    
    return data.map(msg => ({
      ...msg,
      conversation: msg.conversations
    }))
  },

  // Update message
  async update(id: string, updates: MessageUpdate): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating message:', error)
      return null
    }
    return data
  }
}
// Usage tracking operations
export const usageDb = {
  // Get today's date in IST timezone
  getTodayIST(): string {
    const now = new Date()
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
    const istTime = new Date(now.getTime() + istOffset)
    return istTime.toISOString().split('T')[0]
  },

  // Create or update daily usage
  async upsertDailyUsage(userId: string, date: string, messageCount: number = 1, tokensUsed: number = 0): Promise<UsageLog | null> {
    const { data, error } = await supabase
      .from('usage_logs')
      .upsert({
        user_id: userId,
        date,
        message_count: messageCount,
        tokens_used: tokensUsed
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error upserting usage log:', error)
      return null
    }
    return data
  },

  // Get today's usage for user (using IST timezone)
  async getTodayUsage(userId: string): Promise<number> {
    const today = this.getTodayIST()
    const { data, error } = await supabase
      .from('usage_logs')
      .select('message_count')
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    
    if (error) {
      return 0 // No usage record means 0 messages
    }
    return data?.message_count || 0
  },

  // Get usage for specific date
  async getUsageForDate(userId: string, date: string): Promise<number> {
    const { data, error } = await supabase
      .from('usage_logs')
      .select('message_count')
      .eq('user_id', userId)
      .eq('date', date)
      .single()
    
    if (error) {
      return 0 // No usage record means 0 messages
    }
    return data?.message_count || 0
  },

  // Get weekly usage for user
  async getWeeklyUsage(userId: string): Promise<number> {
    const today = this.getTodayIST()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoIST = new Date(weekAgo.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('usage_logs')
      .select('message_count')
      .eq('user_id', userId)
      .gte('date', weekAgoIST)
      .lte('date', today)
    
    if (error) {
      console.error('Error fetching weekly usage:', error)
      return 0
    }
    
    return data.reduce((total, log) => total + (log.message_count || 0), 0)
  },

  // Get monthly usage for user
  async getMonthlyUsage(userId: string, year: number, month: number): Promise<number> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0] // Last day of month
    
    const { data, error } = await supabase
      .from('usage_logs')
      .select('message_count')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
    
    if (error) {
      console.error('Error fetching monthly usage:', error)
      return 0
    }
    
    return data.reduce((total, log) => total + (log.message_count || 0), 0)
  },

  // Get current month usage
  async getCurrentMonthUsage(userId: string): Promise<number> {
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istTime = new Date(now.getTime() + istOffset)
    return this.getMonthlyUsage(userId, istTime.getFullYear(), istTime.getMonth() + 1)
  },

  // Increment daily usage (using IST timezone)
  async incrementDailyUsage(userId: string, tokensUsed: number = 0): Promise<boolean> {
    const today = this.getTodayIST()
    
    // First try to increment existing record
    const { data: existing } = await supabase
      .from('usage_logs')
      .select('message_count, tokens_used')
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    
    if (existing) {
      const { error } = await supabase
        .from('usage_logs')
        .update({
          message_count: existing.message_count + 1,
          tokens_used: (existing.tokens_used || 0) + tokensUsed
        })
        .eq('user_id', userId)
        .eq('date', today)
      
      return !error
    } else {
      // Create new record
      const { error } = await supabase
        .from('usage_logs')
        .insert({
          user_id: userId,
          date: today,
          message_count: 1,
          tokens_used: tokensUsed
        })
      
      return !error
    }
  },

  // Get usage statistics for dashboard
  async getUsageStats(userId: string): Promise<{
    todayUsage: number
    weeklyUsage: number
    monthlyUsage: number
    dailyLimit: number
    remainingToday: number
    usageHistory: Array<{ date: string; count: number }>
  }> {
    const user = await userDb.getById(userId)
    const isFreeTier = user?.subscription_tier === 'free'
    const dailyLimit = isFreeTier ? 20 : -1 // -1 means unlimited
    
    const todayUsage = await this.getTodayUsage(userId)
    const weeklyUsage = await this.getWeeklyUsage(userId)
    const monthlyUsage = await this.getCurrentMonthUsage(userId)
    const remainingToday = isFreeTier ? Math.max(0, dailyLimit - todayUsage) : -1
    
    // Get last 7 days usage history
    const history: Array<{ date: string; count: number }> = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0]
      const count = await this.getUsageForDate(userId, istDate)
      history.push({ date: istDate, count })
    }
    
    return {
      todayUsage,
      weeklyUsage,
      monthlyUsage,
      dailyLimit,
      remainingToday,
      usageHistory: history
    }
  }
}

// Subscription operations
export const subscriptionDb = {
  // Create new subscription
  async create(subscriptionData: SubscriptionInsert): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating subscription:', error)
      return null
    }
    return data
  },

  // Get subscription by user ID
  async getByUserId(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      console.error('Error fetching subscription:', error)
      return null
    }
    return data
  },

  // Update subscription
  async update(id: string, updates: SubscriptionUpdate): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating subscription:', error)
      return null
    }
    return data
  },

  // Get active subscriptions (for billing/renewal processing)
  async getActiveSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .not('current_period_end', 'is', null)
      .lt('current_period_end', new Date().toISOString())
    
    if (error) {
      console.error('Error fetching active subscriptions:', error)
      return []
    }
    return data
  }
}

// Payment operations
export const paymentDb = {
  // Create new payment record
  async create(paymentData: PaymentInsert): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating payment:', error)
      return null
    }
    return data
  },

  // Get payments by user ID
  async getByUserId(userId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching payments:', error)
      return []
    }
    return data
  },

  // Update payment status
  async updateStatus(id: string, status: Payment['status']): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating payment status:', error)
      return null
    }
    return data
  },

  // Get payment by Razorpay payment ID
  async getByRazorpayId(razorpayPaymentId: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('razorpay_payment_id', razorpayPaymentId)
      .single()
    
    if (error) {
      console.error('Error fetching payment by Razorpay ID:', error)
      return null
    }
    return data
  }
}

// Utility functions
export const dbUtils = {
  // Check if user has reached daily limit
  async hasReachedDailyLimit(userId: string): Promise<boolean> {
    const user = await userDb.getById(userId)
    if (!user || user.subscription_tier !== 'free') {
      return false // Paid users have no limits
    }
    
    const todayUsage = await usageDb.getTodayUsage(userId)
    return todayUsage >= 20 // Free tier limit
  },

  // Check if user is approaching daily limit (80% threshold)
  async isApproachingDailyLimit(userId: string): Promise<boolean> {
    const user = await userDb.getById(userId)
    if (!user || user.subscription_tier !== 'free') {
      return false // Paid users have no limits
    }
    
    const todayUsage = await usageDb.getTodayUsage(userId)
    return todayUsage >= 16 // 80% of 20 messages
  },

  // Get user's remaining messages for today
  async getRemainingMessages(userId: string): Promise<number> {
    const user = await userDb.getById(userId)
    if (!user || user.subscription_tier !== 'free') {
      return -1 // Unlimited for paid users
    }
    
    const todayUsage = await usageDb.getTodayUsage(userId)
    return Math.max(0, 20 - todayUsage)
  },

  // Get usage limit status with warnings
  async getUsageLimitStatus(userId: string): Promise<{
    hasReachedLimit: boolean
    isApproachingLimit: boolean
    remainingMessages: number
    todayUsage: number
    dailyLimit: number
    warningMessage?: string
    limitMessage?: string
  }> {
    const user = await userDb.getById(userId)
    const isFreeTier = user?.subscription_tier === 'free'
    const dailyLimit = isFreeTier ? 20 : -1
    const todayUsage = await usageDb.getTodayUsage(userId)
    const remainingMessages = isFreeTier ? Math.max(0, dailyLimit - todayUsage) : -1
    const hasReachedLimit = isFreeTier && todayUsage >= dailyLimit
    const isApproachingLimit = isFreeTier && todayUsage >= 16 && todayUsage < dailyLimit

    let warningMessage: string | undefined
    let limitMessage: string | undefined

    if (hasReachedLimit) {
      limitMessage = "You've reached your daily limit of 20 messages. Upgrade to Pro for unlimited messages at just ₹499/month!"
    } else if (isApproachingLimit) {
      warningMessage = `You have ${remainingMessages} messages remaining today. Consider upgrading to Pro for unlimited access.`
    }

    return {
      hasReachedLimit,
      isApproachingLimit,
      remainingMessages,
      todayUsage,
      dailyLimit,
      warningMessage,
      limitMessage
    }
  },

  // Reset daily usage counters (for cron job)
  async resetDailyCounters(): Promise<boolean> {
    try {
      // This would typically be handled by a cron job or scheduled function
      // For now, we'll implement a cleanup function that can be called
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayIST = new Date(yesterday.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0]
      
      // The daily reset is automatic since we use date-based records
      // This function can be used for cleanup or verification
      console.log(`Daily counters reset for date: ${yesterdayIST}`)
      return true
    } catch (error) {
      console.error('Error resetting daily counters:', error)
      return false
    }
  },

  // Clean up old usage logs (keep last 90 days)
  async cleanupOldUsageLogs(): Promise<boolean> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]
    
    const { error } = await supabase
      .from('usage_logs')
      .delete()
      .lt('date', cutoffDateStr)
    
    if (error) {
      console.error('Error cleaning up old usage logs:', error)
      return false
    }
    return true
  },

  // Get conversation analytics for a user
  async getConversationAnalytics(userId: string): Promise<{
    totalConversations: number
    totalMessages: number
    averageMessagesPerConversation: number
    mostActiveDay: string | null
    conversationsThisWeek: number
    conversationsThisMonth: number
  }> {
    try {
      // Get total conversations
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Get total messages
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*, conversations!inner(*)', { count: 'exact', head: true })
        .eq('conversations.user_id', userId)

      // Get conversations from this week
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const { count: conversationsThisWeek } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneWeekAgo.toISOString())

      // Get conversations from this month
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      const { count: conversationsThisMonth } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneMonthAgo.toISOString())

      // Get most active day from usage logs
      const { data: usageData } = await supabase
        .from('usage_logs')
        .select('date, message_count')
        .eq('user_id', userId)
        .order('message_count', { ascending: false })
        .limit(1)

      return {
        totalConversations: totalConversations || 0,
        totalMessages: totalMessages || 0,
        averageMessagesPerConversation: totalConversations ? Math.round((totalMessages || 0) / totalConversations) : 0,
        mostActiveDay: usageData?.[0]?.date || null,
        conversationsThisWeek: conversationsThisWeek || 0,
        conversationsThisMonth: conversationsThisMonth || 0
      }
    } catch (error) {
      console.error('Error getting conversation analytics:', error)
      return {
        totalConversations: 0,
        totalMessages: 0,
        averageMessagesPerConversation: 0,
        mostActiveDay: null,
        conversationsThisWeek: 0,
        conversationsThisMonth: 0
      }
    }
  }
}