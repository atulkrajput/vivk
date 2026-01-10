export interface User {
  id: string
  email: string
  password_hash: string
  email_verified: boolean
  subscription_tier: 'free' | 'pro' | 'business'
  subscription_status: 'active' | 'cancelled' | 'expired'
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
  date: string
  message_count: number
  tokens_used: number
  created_at: Date
}

export interface Subscription {
  id: string
  user_id: string
  razorpay_subscription_id?: string
  plan_id: string
  status: string
  current_period_start?: Date
  current_period_end?: Date
  created_at: Date
  updated_at: Date
}

export interface Payment {
  id: string
  user_id: string
  razorpay_payment_id?: string
  amount: number
  currency: string
  status: string
  created_at: Date
}