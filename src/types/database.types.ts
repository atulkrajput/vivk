// Database table interfaces matching Supabase schema
export interface User {
  id: string
  email: string
  password_hash: string
  email_verified: boolean
  subscription_tier: 'free' | 'pro' | 'business'
  subscription_status: 'active' | 'cancelled' | 'expired' | 'pending'
  subscription_id?: string
  subscription_expires_at?: Date
  created_at: Date
  updated_at: Date
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: Date
  updated_at: Date
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  tokens?: number
  created_at: Date
}

export interface UsageLog {
  id: string
  user_id: string
  date: string // ISO date string (YYYY-MM-DD)
  message_count: number
  tokens_used: number
  created_at: Date
}

export interface Subscription {
  id: string
  user_id: string
  razorpay_subscription_id?: string
  plan_id: 'free' | 'pro' | 'business'
  status: 'active' | 'cancelled' | 'expired' | 'pending'
  current_period_start?: Date
  current_period_end?: Date
  created_at: Date
  updated_at: Date
}

export interface Payment {
  id: string
  user_id: string
  razorpay_payment_id?: string
  amount: number // Amount in paise
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: Date
}

// Database insert types (without auto-generated fields)
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: Date
  updated_at?: Date
}

export type ConversationInsert = Omit<Conversation, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: Date
  updated_at?: Date
}

export type MessageInsert = Omit<Message, 'id' | 'created_at'> & {
  id?: string
  created_at?: Date
}

export type UsageLogInsert = Omit<UsageLog, 'id' | 'created_at'> & {
  id?: string
  created_at?: Date
}

export type SubscriptionInsert = Omit<Subscription, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: Date
  updated_at?: Date
}

export type PaymentInsert = Omit<Payment, 'id' | 'created_at'> & {
  id?: string
  created_at?: Date
}

// Database update types (all fields optional except id)
export type UserUpdate = Partial<Omit<User, 'id' | 'created_at'>>
export type ConversationUpdate = Partial<Omit<Conversation, 'id' | 'created_at'>>
export type MessageUpdate = Partial<Omit<Message, 'id' | 'created_at'>>
export type UsageLogUpdate = Partial<Omit<UsageLog, 'id' | 'created_at'>>
export type SubscriptionUpdate = Partial<Omit<Subscription, 'id' | 'created_at'>>
export type PaymentUpdate = Partial<Omit<Payment, 'id' | 'created_at'>>

// Joined data types for complex queries
export interface ConversationWithMessageCount extends Conversation {
  message_count: number
  last_message?: string
  last_activity: Date
}

export interface UserWithSubscription extends User {
  subscription?: Subscription
  usage_today?: number
  usage_this_month?: number
}

export interface MessageWithConversation extends Message {
  conversation: Pick<Conversation, 'id' | 'title' | 'user_id'>
}