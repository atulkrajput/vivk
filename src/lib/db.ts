import mysql from 'mysql2/promise'
import type {
  User,
  Conversation,
  Message,
  UsageLog,
  Subscription,
  Payment,
  Plan,
  UserInsert,
  ConversationInsert,
  MessageInsert,
  SubscriptionInsert,
  PaymentInsert,
  UserUpdate,
  ConversationUpdate,
  MessageUpdate,
  SubscriptionUpdate,
  ConversationWithMessageCount,
  UserWithSubscription,
  MessageWithConversation
} from '@/types/database.types'

// MySQL connection pool (lazy initialized)
let pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl && !dbUrl.includes('placeholder')) {
      pool = mysql.createPool(dbUrl)
    } else {
      // Fallback to individual env vars
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vivk',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      })
    }
  }
  return pool
}

// Helper to run queries safely
async function query<T>(sql: string, params?: any[]): Promise<T[]> {
  const db = getPool()
  const [rows] = await db.execute(sql, params)
  return rows as T[]
}

async function queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] || null
}

// Database connection test
export async function testConnection(): Promise<boolean> {
  try {
    const envCheck = validateEnvironment()
    if (!envCheck.isValid) {
      console.error('Missing database environment variables:', envCheck.missingVars)
      return false
    }
    await query('SELECT 1')
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

// Runtime validation
export function validateEnvironment(): { isValid: boolean; missingVars: string[] } {
  const hasDbUrl = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder')
  const hasIndividualVars = process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME

  if (hasDbUrl || hasIndividualVars) {
    return { isValid: true, missingVars: [] }
  }

  const missingVars: string[] = []
  if (!hasDbUrl) missingVars.push('DATABASE_URL')
  if (!process.env.DB_HOST) missingVars.push('DB_HOST')
  if (!process.env.DB_USER) missingVars.push('DB_USER')
  if (!process.env.DB_NAME) missingVars.push('DB_NAME')

  return { isValid: false, missingVars }
}

// User operations
export const userDb = {
  async create(userData: UserInsert): Promise<User | null> {
    try {
      const id = crypto.randomUUID()
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, phone, country_code, address, email_verified, subscription_tier, subscription_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userData.email, userData.password_hash, userData.full_name || '',
         userData.phone || '', userData.country_code || '+91', userData.address || null,
         userData.email_verified ?? false,
         userData.subscription_tier || 'free', userData.subscription_status || 'active']
      )
      return await this.getById(id)
    } catch (error) {
      console.error('Error creating user:', error)
      return null
    }
  },

  async getById(id: string): Promise<User | null> {
    try {
      return await queryOne<User>('SELECT * FROM users WHERE id = ?', [id])
    } catch (error) {
      console.error('Error fetching user by ID:', error)
      return null
    }
  },

  async getByEmail(email: string): Promise<User | null> {
    try {
      return await queryOne<User>('SELECT * FROM users WHERE email = ?', [email])
    } catch (error) {
      console.error('Error fetching user by email:', error)
      return null
    }
  },

  async update(id: string, updates: UserUpdate): Promise<User | null> {
    try {
      const fields: string[] = []
      const values: any[] = []

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`)
          values.push(value instanceof Date ? value.toISOString().slice(0, 19).replace('T', ' ') : value)
        }
      }

      if (fields.length === 0) return await this.getById(id)

      values.push(id)
      await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
      return await this.getById(id)
    } catch (error) {
      console.error('Error updating user:', error)
      return null
    }
  },

  async getWithSubscription(id: string): Promise<UserWithSubscription | null> {
    try {
      const user = await this.getById(id)
      if (!user) return null

      const sub = await queryOne<Subscription>(
        'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [id]
      )
      return { ...user, subscription: sub || undefined }
    } catch (error) {
      console.error('Error fetching user with subscription:', error)
      return null
    }
  }
}

// Conversation operations
export const conversationDb = {
  async create(data: ConversationInsert): Promise<Conversation | null> {
    try {
      const id = crypto.randomUUID()
      await query(
        'INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)',
        [id, data.user_id, data.title || 'New Conversation']
      )
      return await this.getById(id)
    } catch (error) {
      console.error('Error creating conversation:', error)
      return null
    }
  },

  async getById(id: string): Promise<Conversation | null> {
    try {
      return await queryOne<Conversation>('SELECT * FROM conversations WHERE id = ?', [id])
    } catch (error) {
      console.error('Error fetching conversation:', error)
      return null
    }
  },

  async getByUserId(userId: string, options?: {
    search?: string; limit?: number; offset?: number
  }): Promise<ConversationWithMessageCount[]> {
    try {
      let sql = `
        SELECT c.*, COUNT(m.id) as message_count,
          SUBSTRING(MAX(m.content), 1, 100) as last_message,
          COALESCE(MAX(m.created_at), c.created_at) as last_activity
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE c.user_id = ?`
      const params: any[] = [userId]

      if (options?.search) {
        sql += ' AND c.title LIKE ?'
        params.push(`%${options.search}%`)
      }

      sql += ' GROUP BY c.id ORDER BY last_activity DESC'

      if (options?.limit) {
        sql += ' LIMIT ?'
        params.push(options.limit)
      }
      if (options?.offset) {
        sql += ' OFFSET ?'
        params.push(options.offset)
      }

      return await query<ConversationWithMessageCount>(sql, params)
    } catch (error) {
      console.error('Error fetching user conversations:', error)
      return []
    }
  },

  async update(id: string, updates: ConversationUpdate): Promise<Conversation | null> {
    try {
      const fields: string[] = []
      const values: any[] = []
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`)
          values.push(value instanceof Date ? value.toISOString().slice(0, 19).replace('T', ' ') : value)
        }
      }
      if (fields.length === 0) return await this.getById(id)
      values.push(id)
      await query(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`, values)
      return await this.getById(id)
    } catch (error) {
      console.error('Error updating conversation:', error)
      return null
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await query('DELETE FROM conversations WHERE id = ?', [id])
      return true
    } catch (error) {
      console.error('Error deleting conversation:', error)
      return false
    }
  }
}

// Message operations
export const messageDb = {
  async create(data: MessageInsert): Promise<Message | null> {
    try {
      const id = crypto.randomUUID()
      await query(
        'INSERT INTO messages (id, conversation_id, role, content, tokens) VALUES (?, ?, ?, ?, ?)',
        [id, data.conversation_id, data.role, data.content, data.tokens || null]
      )
      return await queryOne<Message>('SELECT * FROM messages WHERE id = ?', [id])
    } catch (error) {
      console.error('Error creating message:', error)
      return null
    }
  },

  async getByConversationId(conversationId: string): Promise<Message[]> {
    try {
      return await query<Message>(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId]
      )
    } catch (error) {
      console.error('Error fetching messages:', error)
      return []
    }
  },

  async getWithConversation(conversationId: string): Promise<MessageWithConversation[]> {
    try {
      const rows = await query<any>(
        `SELECT m.*, c.id as conv_id, c.title as conv_title, c.user_id as conv_user_id
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at ASC`,
        [conversationId]
      )
      return rows.map(row => ({
        id: row.id, conversation_id: row.conversation_id, role: row.role,
        content: row.content, tokens: row.tokens, created_at: row.created_at,
        conversation: { id: row.conv_id, title: row.conv_title, user_id: row.conv_user_id }
      }))
    } catch (error) {
      console.error('Error fetching messages with conversation:', error)
      return []
    }
  },

  async update(id: string, updates: MessageUpdate): Promise<Message | null> {
    try {
      const fields: string[] = []
      const values: any[] = []
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) { fields.push(`${key} = ?`); values.push(value) }
      }
      if (fields.length === 0) return await queryOne<Message>('SELECT * FROM messages WHERE id = ?', [id])
      values.push(id)
      await query(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`, values)
      return await queryOne<Message>('SELECT * FROM messages WHERE id = ?', [id])
    } catch (error) {
      console.error('Error updating message:', error)
      return null
    }
  }
}

// Usage tracking operations
export const usageDb = {
  getTodayIST(): string {
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istTime = new Date(now.getTime() + istOffset)
    return istTime.toISOString().split('T')[0]
  },

  async getTodayUsage(userId: string): Promise<number> {
    const today = this.getTodayIST()
    const row = await queryOne<{ message_count: number }>(
      'SELECT message_count FROM usage_logs WHERE user_id = ? AND date = ?', [userId, today]
    )
    return row?.message_count || 0
  },

  async getUsageForDate(userId: string, date: string): Promise<number> {
    const row = await queryOne<{ message_count: number }>(
      'SELECT message_count FROM usage_logs WHERE user_id = ? AND date = ?', [userId, date]
    )
    return row?.message_count || 0
  },

  async getWeeklyUsage(userId: string): Promise<number> {
    const today = this.getTodayIST()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoIST = new Date(weekAgo.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0]

    const rows = await query<{ message_count: number }>(
      'SELECT message_count FROM usage_logs WHERE user_id = ? AND date >= ? AND date <= ?',
      [userId, weekAgoIST, today]
    )
    return rows.reduce((total, r) => total + (r.message_count || 0), 0)
  },

  async getMonthlyUsage(userId: string, year: number, month: number): Promise<number> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const rows = await query<{ message_count: number }>(
      'SELECT message_count FROM usage_logs WHERE user_id = ? AND date >= ? AND date <= ?',
      [userId, startDate, endDate]
    )
    return rows.reduce((total, r) => total + (r.message_count || 0), 0)
  },

  async getCurrentMonthUsage(userId: string): Promise<number> {
    const now = new Date()
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
    return this.getMonthlyUsage(userId, istTime.getFullYear(), istTime.getMonth() + 1)
  },

  async incrementDailyUsage(userId: string, tokensUsed: number = 0): Promise<boolean> {
    try {
      const today = this.getTodayIST()
      await query(
        `INSERT INTO usage_logs (id, user_id, date, message_count, tokens_used)
         VALUES (UUID(), ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE message_count = message_count + 1, tokens_used = tokens_used + ?`,
        [userId, today, tokensUsed, tokensUsed]
      )
      return true
    } catch (error) {
      console.error('Error incrementing daily usage:', error)
      return false
    }
  },

  async getUsageStats(userId: string) {
    const user = await userDb.getById(userId)
    const plan = await planDb.getById(user?.subscription_tier || 'free')
    const dailyLimit = plan?.daily_message_limit ?? 20
    const hasLimit = dailyLimit !== -1

    const todayUsage = await this.getTodayUsage(userId)
    const weeklyUsage = await this.getWeeklyUsage(userId)
    const monthlyUsage = await this.getCurrentMonthUsage(userId)
    const remainingToday = hasLimit ? Math.max(0, dailyLimit - todayUsage) : -1

    const history: Array<{ date: string; count: number }> = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0]
      const count = await this.getUsageForDate(userId, istDate)
      history.push({ date: istDate, count })
    }

    return { todayUsage, weeklyUsage, monthlyUsage, dailyLimit, remainingToday, usageHistory: history }
  }
}

// Subscription operations
export const subscriptionDb = {
  async create(data: SubscriptionInsert): Promise<Subscription | null> {
    try {
      const id = crypto.randomUUID()
      const start = data.current_period_start instanceof Date
        ? data.current_period_start.toISOString().slice(0, 19).replace('T', ' ') : data.current_period_start || null
      const end = data.current_period_end instanceof Date
        ? data.current_period_end.toISOString().slice(0, 19).replace('T', ' ') : data.current_period_end || null

      await query(
        `INSERT INTO subscriptions (id, user_id, razorpay_subscription_id, plan_id, status, current_period_start, current_period_end)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, data.user_id, data.razorpay_subscription_id || null, data.plan_id, data.status, start, end]
      )
      return await queryOne<Subscription>('SELECT * FROM subscriptions WHERE id = ?', [id])
    } catch (error) {
      console.error('Error creating subscription:', error)
      return null
    }
  },

  async getByUserId(userId: string): Promise<Subscription | null> {
    try {
      return await queryOne<Subscription>(
        'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]
      )
    } catch (error) {
      console.error('Error fetching subscription:', error)
      return null
    }
  },

  async update(id: string, updates: SubscriptionUpdate): Promise<Subscription | null> {
    try {
      const fields: string[] = []
      const values: any[] = []
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`)
          values.push(value instanceof Date ? value.toISOString().slice(0, 19).replace('T', ' ') : value)
        }
      }
      if (fields.length === 0) return await queryOne<Subscription>('SELECT * FROM subscriptions WHERE id = ?', [id])
      values.push(id)
      await query(`UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`, values)
      return await queryOne<Subscription>('SELECT * FROM subscriptions WHERE id = ?', [id])
    } catch (error) {
      console.error('Error updating subscription:', error)
      return null
    }
  },

  async getActiveSubscriptions(): Promise<Subscription[]> {
    try {
      return await query<Subscription>(
        'SELECT * FROM subscriptions WHERE status = ? AND current_period_end < NOW()',
        ['active']
      )
    } catch (error) {
      console.error('Error fetching active subscriptions:', error)
      return []
    }
  }
}

// Payment operations
export const paymentDb = {
  async create(data: PaymentInsert): Promise<Payment | null> {
    try {
      const id = crypto.randomUUID()
      await query(
        'INSERT INTO payments (id, user_id, razorpay_payment_id, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.user_id, data.razorpay_payment_id || null, data.amount, data.currency || 'INR', data.status]
      )
      return await queryOne<Payment>('SELECT * FROM payments WHERE id = ?', [id])
    } catch (error) {
      console.error('Error creating payment:', error)
      return null
    }
  },

  async getByUserId(userId: string): Promise<Payment[]> {
    try {
      return await query<Payment>(
        'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC', [userId]
      )
    } catch (error) {
      console.error('Error fetching payments:', error)
      return []
    }
  },

  async updateStatus(id: string, status: Payment['status']): Promise<Payment | null> {
    try {
      await query('UPDATE payments SET status = ? WHERE id = ?', [status, id])
      return await queryOne<Payment>('SELECT * FROM payments WHERE id = ?', [id])
    } catch (error) {
      console.error('Error updating payment status:', error)
      return null
    }
  },

  async getByRazorpayId(razorpayPaymentId: string): Promise<Payment | null> {
    try {
      return await queryOne<Payment>(
        'SELECT * FROM payments WHERE razorpay_payment_id = ?', [razorpayPaymentId]
      )
    } catch (error) {
      console.error('Error fetching payment by Razorpay ID:', error)
      return null
    }
  }
}

// Plan operations (reads from plans table)
let plansCache: Map<string, Plan> | null = null
let plansCacheTime = 0
const PLANS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function parsePlanRow(row: any): Plan {
  return {
    ...row,
    api_access: row.api_access === 1 || row.api_access === true,
    team_features: row.team_features === 1 || row.team_features === true,
    priority_support: row.priority_support === 1 || row.priority_support === true,
    is_popular: row.is_popular === 1 || row.is_popular === true,
    is_active: row.is_active === 1 || row.is_active === true,
    features: typeof row.features === 'string' ? JSON.parse(row.features) : (row.features || []),
  }
}

export const planDb = {
  async getAll(): Promise<Plan[]> {
    try {
      // Use cache if fresh
      if (plansCache && Date.now() - plansCacheTime < PLANS_CACHE_TTL) {
        return Array.from(plansCache.values())
      }
      const rows = await query<any>('SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC')
      const plans = rows.map(parsePlanRow)
      plansCache = new Map(plans.map(p => [p.id, p]))
      plansCacheTime = Date.now()
      return plans
    } catch (error) {
      console.error('Error fetching plans:', error)
      return []
    }
  },

  async getById(planId: string): Promise<Plan | null> {
    try {
      // Check cache first
      if (plansCache && Date.now() - plansCacheTime < PLANS_CACHE_TTL) {
        return plansCache.get(planId) || null
      }
      await this.getAll() // populate cache
      return plansCache?.get(planId) || null
    } catch (error) {
      console.error('Error fetching plan:', error)
      return null
    }
  },

  async getDailyLimit(planId: string): Promise<number> {
    const plan = await this.getById(planId)
    return plan?.daily_message_limit ?? 20
  },

  async getAIModel(planId: string): Promise<string> {
    const plan = await this.getById(planId)
    return plan?.ai_model ?? 'haiku'
  },

  clearCache() {
    plansCache = null
    plansCacheTime = 0
  }
}

// Utility functions
export const dbUtils = {
  async hasReachedDailyLimit(userId: string): Promise<boolean> {
    const user = await userDb.getById(userId)
    if (!user) return true
    const plan = await planDb.getById(user.subscription_tier)
    if (!plan) return true
    // -1 means unlimited
    if (plan.daily_message_limit === -1) return false
    const todayUsage = await usageDb.getTodayUsage(userId)
    return todayUsage >= plan.daily_message_limit
  },

  async isApproachingDailyLimit(userId: string): Promise<boolean> {
    const user = await userDb.getById(userId)
    if (!user) return false
    const plan = await planDb.getById(user.subscription_tier)
    if (!plan || plan.daily_message_limit === -1) return false
    const todayUsage = await usageDb.getTodayUsage(userId)
    const threshold = Math.max(1, plan.daily_message_limit - 4) // warn when 4 messages left
    return todayUsage >= threshold && todayUsage < plan.daily_message_limit
  },

  async getRemainingMessages(userId: string): Promise<number> {
    const user = await userDb.getById(userId)
    if (!user) return 0
    const plan = await planDb.getById(user.subscription_tier)
    if (!plan || plan.daily_message_limit === -1) return -1
    const todayUsage = await usageDb.getTodayUsage(userId)
    return Math.max(0, plan.daily_message_limit - todayUsage)
  },

  async getUsageLimitStatus(userId: string) {
    const user = await userDb.getById(userId)
    const plan = await planDb.getById(user?.subscription_tier || 'free')
    const dailyLimit = plan?.daily_message_limit ?? 20
    const hasLimit = dailyLimit !== -1
    const todayUsage = await usageDb.getTodayUsage(userId)
    const remainingMessages = hasLimit ? Math.max(0, dailyLimit - todayUsage) : -1
    const hasReachedLimit = hasLimit && todayUsage >= dailyLimit
    const threshold = Math.max(1, dailyLimit - 4)
    const isApproachingLimit = hasLimit && todayUsage >= threshold && todayUsage < dailyLimit

    let warningMessage: string | undefined
    let limitMessage: string | undefined

    if (hasReachedLimit) {
      limitMessage = `You've reached your daily limit of ${dailyLimit} messages. Upgrade your plan for more messages!`
    } else if (isApproachingLimit) {
      warningMessage = `You have ${remainingMessages} messages remaining today. Consider upgrading for unlimited access.`
    }

    return { hasReachedLimit, isApproachingLimit, remainingMessages, todayUsage, dailyLimit, warningMessage, limitMessage }
  },

  async getConversationAnalytics(userId: string) {
    try {
      const [totalConvRow] = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM conversations WHERE user_id = ?', [userId]
      )
      const [totalMsgRow] = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = ?', [userId]
      )
      const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const [weekRow] = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM conversations WHERE user_id = ? AND created_at >= ?',
        [userId, oneWeekAgo.toISOString().slice(0, 19).replace('T', ' ')]
      )
      const oneMonthAgo = new Date(); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      const [monthRow] = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM conversations WHERE user_id = ? AND created_at >= ?',
        [userId, oneMonthAgo.toISOString().slice(0, 19).replace('T', ' ')]
      )

      const totalConversations = totalConvRow?.cnt || 0
      const totalMessages = totalMsgRow?.cnt || 0

      return {
        totalConversations, totalMessages,
        averageMessagesPerConversation: totalConversations ? Math.round(totalMessages / totalConversations) : 0,
        mostActiveDay: null,
        conversationsThisWeek: weekRow?.cnt || 0,
        conversationsThisMonth: monthRow?.cnt || 0
      }
    } catch (error) {
      console.error('Error getting conversation analytics:', error)
      return { totalConversations: 0, totalMessages: 0, averageMessagesPerConversation: 0, mostActiveDay: null, conversationsThisWeek: 0, conversationsThisMonth: 0 }
    }
  }
}