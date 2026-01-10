export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SubscriptionPlan {
  id: 'free' | 'pro' | 'business'
  name: string
  price: number
  currency: 'INR'
  features: {
    dailyMessageLimit?: number
    aiModel: 'claude-haiku' | 'claude-sonnet'
    teamFeatures: boolean
    prioritySupport: boolean
    apiAccess: boolean
  }
}

export interface UsageStats {
  dailyMessages: number
  monthlyMessages: number
  dailyLimit?: number
  resetTime: Date
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ConversationSummary {
  id: string
  title: string
  lastMessage: string
  lastActivity: Date
  messageCount: number
}