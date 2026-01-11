// Subscription management utilities and definitions

export type SubscriptionTier = 'free' | 'pro' | 'business'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending'

// Subscription tier definitions
export interface SubscriptionPlan {
  id: SubscriptionTier
  name: string
  price: number // Price in paise (Indian currency)
  priceDisplay: string
  currency: string
  interval: 'month' | 'year'
  features: string[]
  limits: {
    dailyMessages: number // -1 for unlimited
    aiModel: 'haiku' | 'sonnet'
    chatHistory: number // days, -1 for unlimited
    apiAccess: boolean
    teamFeatures: boolean
    prioritySupport: boolean
  }
  popular?: boolean
  razorpayPlanId?: string // Razorpay plan ID for recurring billing
}

// Subscription plans configuration
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceDisplay: '₹0',
    currency: 'INR',
    interval: 'month',
    features: [
      '20 messages per day',
      'Claude Haiku AI model',
      '7-day chat history',
      'Basic support'
    ],
    limits: {
      dailyMessages: 20,
      aiModel: 'haiku',
      chatHistory: 7,
      apiAccess: false,
      teamFeatures: false,
      prioritySupport: false
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49900, // ₹499 in paise
    priceDisplay: '₹499',
    currency: 'INR',
    interval: 'month',
    features: [
      'Unlimited messages',
      'Claude Sonnet AI model',
      'Unlimited chat history',
      'API access',
      'Priority support'
    ],
    limits: {
      dailyMessages: -1, // unlimited
      aiModel: 'sonnet',
      chatHistory: -1, // unlimited
      apiAccess: true,
      teamFeatures: false,
      prioritySupport: true
    },
    popular: true,
    razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 299900, // ₹2,999 in paise
    priceDisplay: '₹2,999',
    currency: 'INR',
    interval: 'month',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Custom integrations',
      'Dedicated support',
      'Advanced analytics',
      'Custom AI models'
    ],
    limits: {
      dailyMessages: -1, // unlimited
      aiModel: 'sonnet',
      chatHistory: -1, // unlimited
      apiAccess: true,
      teamFeatures: true,
      prioritySupport: true
    },
    razorpayPlanId: process.env.RAZORPAY_BUSINESS_PLAN_ID
  }
}

// Utility functions
export function getSubscriptionPlan(tier: SubscriptionTier): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[tier]
}

export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS)
}

export function getPaidPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS).filter(plan => plan.price > 0)
}

export function isFreeTier(tier: SubscriptionTier): boolean {
  return tier === 'free'
}

export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier === 'pro' || tier === 'business'
}

export function hasUnlimitedMessages(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_PLANS[tier].limits.dailyMessages === -1
}

export function getAIModel(tier: SubscriptionTier): 'haiku' | 'sonnet' {
  return SUBSCRIPTION_PLANS[tier].limits.aiModel
}

export function hasAPIAccess(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_PLANS[tier].limits.apiAccess
}

export function hasTeamFeatures(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_PLANS[tier].limits.teamFeatures
}

export function hasPrioritySupport(tier: SubscriptionTier): boolean {
  return SUBSCRIPTION_PLANS[tier].limits.prioritySupport
}

// Calculate subscription benefits
export function getSubscriptionBenefits(tier: SubscriptionTier): {
  messagesPerDay: string
  aiModel: string
  chatHistory: string
  features: string[]
} {
  const plan = SUBSCRIPTION_PLANS[tier]
  
  return {
    messagesPerDay: plan.limits.dailyMessages === -1 ? 'Unlimited' : `${plan.limits.dailyMessages} per day`,
    aiModel: plan.limits.aiModel === 'sonnet' ? 'Claude Sonnet (Advanced)' : 'Claude Haiku (Basic)',
    chatHistory: plan.limits.chatHistory === -1 ? 'Unlimited' : `${plan.limits.chatHistory} days`,
    features: plan.features
  }
}

// Subscription status helpers
export function isActiveSubscription(status: SubscriptionStatus): boolean {
  return status === 'active'
}

export function isExpiredSubscription(status: SubscriptionStatus): boolean {
  return status === 'expired'
}

export function isCancelledSubscription(status: SubscriptionStatus): boolean {
  return status === 'cancelled'
}

export function isPendingSubscription(status: SubscriptionStatus): boolean {
  return status === 'pending'
}

// Subscription upgrade/downgrade logic
export function canUpgradeTo(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'business']
  const currentIndex = tierOrder.indexOf(currentTier)
  const targetIndex = tierOrder.indexOf(targetTier)
  
  return targetIndex > currentIndex
}

export function canDowngradeTo(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'business']
  const currentIndex = tierOrder.indexOf(currentTier)
  const targetIndex = tierOrder.indexOf(targetTier)
  
  return targetIndex < currentIndex
}

export function getUpgradePrice(fromTier: SubscriptionTier, toTier: SubscriptionTier): number {
  const fromPlan = SUBSCRIPTION_PLANS[fromTier]
  const toPlan = SUBSCRIPTION_PLANS[toTier]
  
  return Math.max(0, toPlan.price - fromPlan.price)
}

// Format subscription dates
export function formatSubscriptionDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Calculate next billing date
export function getNextBillingDate(currentPeriodEnd: Date | string): Date {
  const current = new Date(currentPeriodEnd)
  const next = new Date(current)
  next.setMonth(next.getMonth() + 1)
  return next
}

// Check if subscription is about to expire (within 7 days)
export function isSubscriptionExpiringSoon(expiresAt: Date | string): boolean {
  const expiry = new Date(expiresAt)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  return daysUntilExpiry <= 7 && daysUntilExpiry > 0
}

// Get subscription status display
export function getSubscriptionStatusDisplay(status: SubscriptionStatus): {
  text: string
  color: string
  bgColor: string
} {
  switch (status) {
    case 'active':
      return {
        text: 'Active',
        color: 'text-green-800',
        bgColor: 'bg-green-100'
      }
    case 'cancelled':
      return {
        text: 'Cancelled',
        color: 'text-yellow-800',
        bgColor: 'bg-yellow-100'
      }
    case 'expired':
      return {
        text: 'Expired',
        color: 'text-red-800',
        bgColor: 'bg-red-100'
      }
    case 'pending':
      return {
        text: 'Pending',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100'
      }
    default:
      return {
        text: 'Unknown',
        color: 'text-gray-800',
        bgColor: 'bg-gray-100'
      }
  }
}